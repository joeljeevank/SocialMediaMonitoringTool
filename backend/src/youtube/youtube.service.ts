import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, IsNull } from 'typeorm';
import { google } from 'googleapis';
import { YouTubeChannel } from './youtube-channel.entity';
import { YouTubeVideo } from './youtube-video.entity';
import { YouTubeAnalytics } from './youtube-analytics.entity';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

function parseDuration(isoDuration?: string | null): string {
  if (!isoDuration) return '00:00';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const secStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

  if (hours > 0) {
    const hrStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hrStr}:${minStr}:${secStr}`;
  }
  return `${minStr}:${secStr}`;
}

@Injectable()
export class YoutubeService implements OnModuleInit {
  private readonly logger = new Logger(YoutubeService.name);

  async onModuleInit() {
    try {
      await this.repairOrphanedVideos();
    } catch (e: any) {
      this.logger.warn(`Startup video repair check failed: ${e.message}`);
    }
  }

  async repairOrphanedVideos(): Promise<void> {
    const orphaned = await this.videoRepo.find({
      where: [{ channelId: IsNull() }, { channel: IsNull() }],
    });
    if (orphaned.length === 0) return;

    this.logger.log(`Found ${orphaned.length} orphaned videos. Repairing channel associations...`);
    const channels = await this.channelRepo.find();
    for (const ch of channels) {
      const playlistId = ch.uploadsPlaylistId || (ch.channelId.startsWith('UC') ? 'UU' + ch.channelId.slice(2) : null);
      if (playlistId) {
        try {
          ch.uploadsPlaylistId = playlistId;
          const auth = (ch.accessToken || ch.refreshToken) ? await this.getAuthenticatedClient(ch) : process.env.YOUTUBE_API_KEY;
          if (auth) {
            const yt = google.youtube({ version: 'v3', auth });
            await this.syncVideosWithApiKey(ch, yt);
          }
        } catch (e: any) {
          this.logger.warn(`Could not repair videos for ${ch.title}: ${e.message}`);
        }
      }
    }
  }

  constructor(
    @InjectRepository(YouTubeChannel)
    private readonly channelRepo: Repository<YouTubeChannel>,
    @InjectRepository(YouTubeVideo)
    private readonly videoRepo: Repository<YouTubeVideo>,
    @InjectRepository(YouTubeAnalytics)
    private readonly analyticsRepo: Repository<YouTubeAnalytics>,
  ) {}

  getConfig(): {
    oauthConfigured: boolean;
    apiKeyConfigured: boolean;
    redirectUri: string;
    clientId: string;
    maskedApiKey: string;
  } {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/youtube/auth/callback';
    const apiKey = process.env.YOUTUBE_API_KEY || '';

    return {
      oauthConfigured: Boolean(clientId && clientSecret),
      apiKeyConfigured: Boolean(apiKey),
      redirectUri,
      clientId: clientId ? `${clientId.slice(0, 16)}...` : '',
      maskedApiKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '',
    };
  }

  saveApiKey(apiKey: string): { success: boolean; message: string; maskedKey: string } {
    const cleanKey = apiKey ? apiKey.trim() : '';
    process.env.YOUTUBE_API_KEY = cleanKey;

    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('YOUTUBE_API_KEY=')) {
          content = content.replace(/YOUTUBE_API_KEY=.*(\r?\n|$)/, `YOUTUBE_API_KEY=${cleanKey}$1`);
        } else {
          content += `\nYOUTUBE_API_KEY=${cleanKey}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf8');
      }
    } catch (e: any) {
      this.logger.warn(`Could not persist API key to .env: ${e.message}`);
    }

    return {
      success: true,
      message: cleanKey ? 'YouTube API Key saved successfully!' : 'YouTube API Key cleared.',
      maskedKey: cleanKey ? `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}` : '',
    };
  }

  private getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/youtube/auth/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth Credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in backend/.env.',
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(): { url: string; configured: boolean } {
    try {
      const oauth2Client = this.getOAuth2Client();
      const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
      });

      return { url, configured: true };
    } catch (e: any) {
      return { url: '', configured: false };
    }
  }

  async handleAuthCallback(code: string): Promise<YouTubeChannel> {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    const oauth2Client = this.getOAuth2Client();

    let tokens: any;
    try {
      const response = await oauth2Client.getToken(code);
      tokens = response.tokens;
      oauth2Client.setCredentials(tokens);
    } catch (err: any) {
      this.logger.error('Failed to exchange Google OAuth code', err.message);
      throw new BadRequestException('Failed to exchange authorization code with Google: ' + err.message);
    }

    // Retrieve Google Account email
    let googleEmail = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userinfo = await oauth2.userinfo.get();
      googleEmail = userinfo.data.email || '';
    } catch (err: any) {
      this.logger.warn('Could not fetch Google user info email', err.message);
    }

    // Retrieve Channel Info from YouTube Data API
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    let channelListRes: any;
    try {
      channelListRes = await youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        mine: true,
      });
    } catch (err: any) {
      this.logger.error('Failed to fetch YouTube channels', err.message);
      throw new BadRequestException('Failed to retrieve YouTube channel info: ' + err.message);
    }

    const items = channelListRes.data.items;
    if (!items || items.length === 0) {
      throw new BadRequestException('No YouTube channels associated with this Google Account.');
    }

    const channelData = items[0];
    const channelId = channelData.id!;
    const snippet = channelData.snippet || {};
    const stats = channelData.statistics || {};
    const contentDetails = channelData.contentDetails || {};

    let channel = await this.channelRepo.findOne({ where: { channelId } });

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    if (channel) {
      channel.title = snippet.title || channel.title;
      channel.description = snippet.description || channel.description;
      channel.customUrl = snippet.customUrl || channel.customUrl;
      channel.thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || channel.thumbnailUrl;
      channel.googleAccountEmail = googleEmail || channel.googleAccountEmail;
      channel.status = 'Connected';
      if (tokens.access_token) channel.accessToken = tokens.access_token;
      if (tokens.refresh_token) channel.refreshToken = tokens.refresh_token;
      channel.tokenExpiresAt = expiresAt;
      channel.subscribers = Number(stats.subscriberCount || channel.subscribers);
      channel.totalViews = String(stats.viewCount || channel.totalViews);
      channel.totalVideos = Number(stats.videoCount || channel.totalVideos);
      channel.uploadsPlaylistId = contentDetails.relatedPlaylists?.uploads || channel.uploadsPlaylistId;
      await this.channelRepo.save(channel);
    } else {
      channel = this.channelRepo.create({
        channelId,
        title: snippet.title || 'YouTube Channel',
        description: snippet.description || '',
        customUrl: snippet.customUrl || '',
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        publishedAt: snippet.publishedAt || new Date().toISOString(),
        status: 'Connected',
        googleAccountEmail: googleEmail,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
        tokenExpiresAt: expiresAt,
        subscribers: Number(stats.subscriberCount || 0),
        totalViews: String(stats.viewCount || '0'),
        totalVideos: Number(stats.videoCount || 0),
        uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || '',
      });
      channel = await this.channelRepo.save(channel);
    }

    // Trigger asynchronous data synchronization
    this.syncChannelData(channel.id).catch((err) => {
      this.logger.error(`Initial background sync failed for channel ${channelId}:`, err.message);
    });

    return channel;
  }

  private async getAuthenticatedClient(channel: YouTubeChannel) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
    });

    // Check if token expired or expires in next 5 minutes
    const isExpired = channel.tokenExpiresAt && new Date(channel.tokenExpiresAt).getTime() - Date.now() < 300000;

    if (isExpired && channel.refreshToken) {
      try {
        const refreshed = await oauth2Client.refreshAccessToken();
        const newTokens = refreshed.credentials;
        if (newTokens.access_token) {
          channel.accessToken = newTokens.access_token;
          if (newTokens.expiry_date) {
            channel.tokenExpiresAt = new Date(newTokens.expiry_date);
          }
          await this.channelRepo.save(channel);
          oauth2Client.setCredentials(newTokens);
        }
      } catch (err: any) {
        this.logger.warn(`Could not refresh access token for channel ${channel.title}:`, err.message);
      }
    }

    return oauth2Client;
  }

  private parseIdentifier(input: string): { type: 'handle' | 'id' | 'username' | 'search'; value: string } {
    let raw = input ? input.trim() : '';
    if (!raw) {
      throw new BadRequestException('Please provide a YouTube channel handle, URL, or channel ID.');
    }

    try {
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const parsed = new URL(raw);
        const p = parsed.pathname;
        if (p.includes('/channel/')) {
          const id = p.split('/channel/')[1].split('/')[0];
          return { type: 'id', value: id };
        }
        if (p.includes('/@')) {
          const handle = p.split('/@')[1].split('/')[0];
          return { type: 'handle', value: `@${handle}` };
        }
        if (p.includes('/c/') || p.includes('/user/')) {
          const user = p.split(/\/(?:c|user)\//)[1].split('/')[0];
          return { type: 'username', value: user };
        }
      }
    } catch {
      // not a valid URL
    }

    if (raw.startsWith('@')) {
      return { type: 'handle', value: raw };
    }

    if (raw.startsWith('UC') && raw.length === 24) {
      return { type: 'id', value: raw };
    }

    if (!raw.includes(' ') && !raw.includes('/')) {
      return { type: 'handle', value: `@${raw}` };
    }

    return { type: 'search', value: raw };
  }

  async trackChannel(identifier: string, explicitApiKey?: string): Promise<any> {
    const apiKey = explicitApiKey || process.env.YOUTUBE_API_KEY;
    const parsed = this.parseIdentifier(identifier);

    if (apiKey) {
      return this.trackChannelWithApiKey(parsed, apiKey);
    }

    return this.trackChannelPublic(parsed);
  }

  private async trackChannelWithApiKey(
    parsed: { type: 'handle' | 'id' | 'username' | 'search'; value: string },
    apiKey: string,
  ): Promise<any> {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    let channelItem: any = null;

    try {
      if (parsed.type === 'id') {
        const res = await youtube.channels.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: [parsed.value],
        });
        channelItem = res.data.items?.[0];
      } else if (parsed.type === 'handle') {
        try {
          const res = await youtube.channels.list({
            part: ['snippet', 'contentDetails', 'statistics'],
            forHandle: parsed.value,
          });
          channelItem = res.data.items?.[0];
        } catch {
          const clean = parsed.value.replace(/^@/, '');
          const res = await youtube.channels.list({
            part: ['snippet', 'contentDetails', 'statistics'],
            forHandle: clean,
          });
          channelItem = res.data.items?.[0];
        }
      } else if (parsed.type === 'username') {
        const res = await youtube.channels.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          forUsername: parsed.value,
        });
        channelItem = res.data.items?.[0];
      }

      if (!channelItem) {
        const searchRes = await youtube.search.list({
          part: ['snippet'],
          q: parsed.value,
          type: ['channel'],
          maxResults: 1,
        });
        const foundId = searchRes.data.items?.[0]?.snippet?.channelId;
        if (foundId) {
          const res = await youtube.channels.list({
            part: ['snippet', 'contentDetails', 'statistics'],
            id: [foundId],
          });
          channelItem = res.data.items?.[0];
        }
      }
    } catch (err: any) {
      this.logger.error(`YouTube API call failed: ${err.message}`);
      throw new BadRequestException(`YouTube API Error: ${err.message}`);
    }

    if (!channelItem) {
      throw new NotFoundException(`No YouTube channel found for "${parsed.value}". Please check handle or channel ID.`);
    }

    const channelId = channelItem.id!;
    const snippet = channelItem.snippet || {};
    const stats = channelItem.statistics || {};
    const contentDetails = channelItem.contentDetails || {};

    let channel = await this.channelRepo.findOne({ where: { channelId } });

    if (channel) {
      channel.title = snippet.title || channel.title;
      channel.description = snippet.description || channel.description;
      channel.customUrl = snippet.customUrl || channel.customUrl;
      channel.thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || channel.thumbnailUrl;
      channel.subscribers = Number(stats.subscriberCount || channel.subscribers);
      channel.totalViews = String(stats.viewCount || channel.totalViews);
      channel.totalVideos = Number(stats.videoCount || channel.totalVideos);
      channel.uploadsPlaylistId = contentDetails.relatedPlaylists?.uploads || channel.uploadsPlaylistId;
      channel.status = 'Connected';
      channel = await this.channelRepo.save(channel);
    } else {
      channel = this.channelRepo.create({
        channelId,
        title: snippet.title || 'YouTube Channel',
        description: snippet.description || '',
        customUrl: snippet.customUrl || (parsed.type === 'handle' ? parsed.value : ''),
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        publishedAt: snippet.publishedAt || new Date().toISOString(),
        status: 'Connected',
        subscribers: Number(stats.subscriberCount || 0),
        totalViews: String(stats.viewCount || '0'),
        totalVideos: Number(stats.videoCount || 0),
        uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || '',
      });
      channel = await this.channelRepo.save(channel);
    }

    if (channel.uploadsPlaylistId) {
      try {
        await this.syncVideosWithApiKey(channel, youtube);
      } catch (err: any) {
        this.logger.warn(`Could not sync videos for ${channel.title}: ${err.message}`);
      }
    }

    channel.lastSyncedAt = new Date().toISOString();
    await this.channelRepo.save(channel);

    const { accessToken, refreshToken, ...safeChannel } = channel;
    return {
      success: true,
      message: `Channel "${channel.title}" tracked successfully!`,
      channel: {
        ...safeChannel,
        isOAuth: false,
        authType: 'identifier',
      },
    };
  }

  private async syncVideosWithApiKey(channel: YouTubeChannel, youtube: any) {
    const playlistRes = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: channel.uploadsPlaylistId,
      maxResults: 50,
    });

    const videoIds = (playlistRes.data.items || [])
      .map((item: any) => item.contentDetails?.videoId)
      .filter((vid: any): vid is string => Boolean(vid));

    if (videoIds.length > 0) {
      const videoDetailsRes = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      for (const item of videoDetailsRes.data.items || []) {
        const vid = item.id!;
        let video = await this.videoRepo.findOne({ where: { videoId: vid } });

        const formattedDuration = parseDuration(item.contentDetails?.duration);
        const viewCount = Number(item.statistics?.viewCount || 0);
        const likeCount = Number(item.statistics?.likeCount || 0);
        const commentCount = Number(item.statistics?.commentCount || 0);

        if (video) {
          video.title = item.snippet?.title || video.title;
          video.description = item.snippet?.description || video.description;
          video.thumbnailUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || video.thumbnailUrl;
          video.publishedAt = item.snippet?.publishedAt || video.publishedAt;
          video.duration = formattedDuration;
          video.views = viewCount;
          video.likes = likeCount;
          video.comments = commentCount;
          video.channel = channel;
          video.channelId = channel.id;
          await this.videoRepo.save(video);
        } else {
          video = this.videoRepo.create({
            videoId: vid,
            title: item.snippet?.title || 'Untitled Video',
            description: item.snippet?.description || '',
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
            publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
            duration: formattedDuration,
            views: viewCount,
            likes: likeCount,
            comments: commentCount,
            channel: channel,
            channelId: channel.id,
          });
          await this.videoRepo.save(video);
        }
      }
    }
  }

  private async trackChannelPublic(parsed: { type: 'handle' | 'id' | 'username' | 'search'; value: string }): Promise<any> {
    const handle = parsed.value.replace(/^@/, '');
    const cleanHandle = `@${handle}`;

    try {
      const res = await axios.get(`https://www.youtube.com/${cleanHandle}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      });

      const html = String(res.data || '');
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const rawTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : handle;

      const subMatch = html.match(/([\d.]+[KMB]?)\s+subscribers/i);
      let subCount = 0;
      if (subMatch) {
        const text = subMatch[1].toUpperCase();
        if (text.endsWith('M')) subCount = parseFloat(text) * 1000000;
        else if (text.endsWith('K')) subCount = parseFloat(text) * 1000;
        else if (text.endsWith('B')) subCount = parseFloat(text) * 1000000000;
        else subCount = parseFloat(text);
      }

      const idMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      const channelId = idMatch ? idMatch[1] : `UC_${Buffer.from(handle).toString('hex').slice(0, 21)}`;

      const thumbMatch = html.match(/"avatar":{"thumbnails":\[{"url":"(https:\/\/[^"]+)"/);
      const thumbUrl = thumbMatch ? thumbMatch[1] : '';

      let channel = await this.channelRepo.findOne({ where: { channelId } });
      if (channel) {
        channel.title = rawTitle || channel.title;
        channel.customUrl = cleanHandle;
        if (thumbUrl) channel.thumbnailUrl = thumbUrl;
        channel.subscribers = subCount;
        channel.status = 'Connected';
        channel = await this.channelRepo.save(channel);
      } else {
        channel = this.channelRepo.create({
          channelId,
          title: rawTitle,
          description: `YouTube channel tracked via handle ${cleanHandle}`,
          customUrl: cleanHandle,
          thumbnailUrl: thumbUrl,
          publishedAt: new Date().toISOString(),
          status: 'Connected',
          subscribers: subCount,
          totalViews: '0',
          totalVideos: 0,
        });
        channel = await this.channelRepo.save(channel);
      }

      channel.lastSyncedAt = new Date().toISOString();
      await this.channelRepo.save(channel);

      const { accessToken, refreshToken, ...safeChannel } = channel;
      return {
        success: true,
        message: `Channel "${channel.title}" tracked successfully! For full video analytics, enter a YouTube API Key.`,
        channel: {
          ...safeChannel,
          isOAuth: false,
          authType: 'identifier',
        },
      };
    } catch (e: any) {
      throw new BadRequestException(
        `Could not retrieve public channel "${parsed.value}". Please configure your YouTube API Key in the dashboard to track channels directly via the official API.`,
      );
    }
  }

  private async syncOAuthChannel(channel: YouTubeChannel): Promise<{ success: boolean; message: string; channel: any }> {
    let authClient: any;
    try {
      authClient = await this.getAuthenticatedClient(channel);
    } catch (err: any) {
      throw new BadRequestException('Authentication failed for this channel: ' + err.message);
    }

    const youtube = google.youtube({ version: 'v3', auth: authClient });
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: authClient });

    // 1. Sync Channel Information (1 unit quota)
    const prevSubCount = Number(channel.subscribers || 0);
    let subDiff = 0;
    try {
      const channelRes = await youtube.channels.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [channel.channelId],
      });

      if (channelRes.data.items && channelRes.data.items.length > 0) {
        const item = channelRes.data.items[0];
        const newSubCount = Number(item.statistics?.subscriberCount || channel.subscribers);
        subDiff = newSubCount - prevSubCount;
        channel.title = item.snippet?.title || channel.title;
        channel.description = item.snippet?.description || channel.description;
        channel.customUrl = item.snippet?.customUrl || channel.customUrl;
        channel.thumbnailUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || channel.thumbnailUrl;
        channel.subscribers = newSubCount;
        channel.totalViews = String(item.statistics?.viewCount || channel.totalViews);
        channel.totalVideos = Number(item.statistics?.videoCount || channel.totalVideos);
        channel.uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || channel.uploadsPlaylistId;
      }
    } catch (err: any) {
      this.logger.error(`Error updating channel stats for ${channel.title}:`, err.message);
    }

    // 2. Sync Recent Videos via Uploads Playlist
    if (channel.uploadsPlaylistId) {
      try {
        await this.syncVideosWithApiKey(channel, youtube);
      } catch (err: any) {
        this.logger.error(`Error syncing videos for ${channel.title}:`, err.message);
      }
    }

    // 3. Sync Analytics API Data (Last 90 Days)
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const startDateObj = new Date(now.getTime() - 92 * 24 * 60 * 60 * 1000);
      const startDate = startDateObj.toISOString().split('T')[0];

      const reportRes = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost',
        dimensions: 'day',
        sort: 'day',
      });

      if (reportRes.data.rows && reportRes.data.rows.length > 0) {
        for (const row of reportRes.data.rows) {
          const [
            day,
            views,
            estimatedMinutesWatched,
            averageViewDuration,
            likes,
            comments,
            shares,
            subscribersGained,
            subscribersLost,
          ] = row;

          const dateStr = String(day);
          let analytic = await this.analyticsRepo.findOne({
            where: { channel: { id: channel.id }, date: dateStr },
          });

          if (analytic) {
            analytic.views = Number(views || 0);
            analytic.watchTimeMinutes = Number(estimatedMinutesWatched || 0);
            analytic.averageViewDurationSeconds = Number(averageViewDuration || 0);
            analytic.likes = Number(likes || 0);
            analytic.comments = Number(comments || 0);
            analytic.shares = Number(shares || 0);
            analytic.subscribersGained = Number(subscribersGained || 0);
            analytic.subscribersLost = Number(subscribersLost || 0);
            await this.analyticsRepo.save(analytic);
          } else {
            analytic = this.analyticsRepo.create({
              date: dateStr,
              views: Number(views || 0),
              watchTimeMinutes: Number(estimatedMinutesWatched || 0),
              averageViewDurationSeconds: Number(averageViewDuration || 0),
              likes: Number(likes || 0),
              comments: Number(comments || 0),
              shares: Number(shares || 0),
              subscribersGained: Number(subscribersGained || 0),
              subscribersLost: Number(subscribersLost || 0),
              channel: channel,
            });
            await this.analyticsRepo.save(analytic);
          }
        }
        channel.lastAnalyticsSyncAt = new Date().toISOString();
      }
    } catch (err: any) {
      this.logger.warn(`Could not sync YouTube Analytics for ${channel.title}: ${err.message}`);
    }

    channel.lastSyncedAt = new Date().toISOString();
    channel.status = 'Connected';
    const saved = await this.channelRepo.save(channel);

    // 4. Synthesize & Update Real-Time Live Analytics for Today & Recent Days
    await this.ensureRealtimeDailyAnalytics(saved, subDiff);

    const { accessToken, refreshToken, ...safeChannel } = saved;
    return {
      success: true,
      message: `Channel "${channel.title}" successfully synchronized.`,
      channel: safeChannel,
    };
  }

  async syncChannelData(id: number): Promise<{ success: boolean; message: string; channel: any }> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException(`YouTube Channel with ID ${id} not found`);
    }

    if (channel.accessToken || channel.refreshToken) {
      try {
        return await this.syncOAuthChannel(channel);
      } catch (err: any) {
        this.logger.warn(`OAuth sync failed for ${channel.title}, trying API Key fallback: ${err.message}`);
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    let subDiff = 0;
    if (apiKey) {
      const youtube = google.youtube({ version: 'v3', auth: apiKey });
      try {
        const channelRes = await youtube.channels.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: [channel.channelId],
        });
        if (channelRes.data.items && channelRes.data.items.length > 0) {
          const item = channelRes.data.items[0];
          const prevSubCount = Number(channel.subscribers || 0);
          const newSubCount = Number(item.statistics?.subscriberCount || channel.subscribers);
          subDiff = newSubCount - prevSubCount;
          channel.title = item.snippet?.title || channel.title;
          channel.description = item.snippet?.description || channel.description;
          channel.customUrl = item.snippet?.customUrl || channel.customUrl;
          channel.thumbnailUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || channel.thumbnailUrl;
          channel.subscribers = newSubCount;
          channel.totalViews = String(item.statistics?.viewCount || channel.totalViews);
          channel.totalVideos = Number(item.statistics?.videoCount || channel.totalVideos);
          channel.uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || channel.uploadsPlaylistId;
        }
        if (channel.uploadsPlaylistId) {
          await this.syncVideosWithApiKey(channel, youtube);
        }
      } catch (err: any) {
        this.logger.warn(`API Key channel update failed for ${channel.title}: ${err.message}`);
      }
    }

    channel.lastSyncedAt = new Date().toISOString();
    channel.status = 'Connected';
    const saved = await this.channelRepo.save(channel);

    await this.ensureRealtimeDailyAnalytics(saved, subDiff);

    const { accessToken, refreshToken, ...safeChannel } = saved;
    return {
      success: true,
      message: `Channel "${channel.title}" successfully synchronized.`,
      channel: safeChannel,
    };
  }

  async syncAllChannels(): Promise<{ success: boolean; syncedCount: number }> {
    const channels = await this.channelRepo.find();
    let count = 0;
    for (const ch of channels) {
      try {
        await this.syncChannelData(ch.id);
        count++;
      } catch (e: any) {
        this.logger.error(`Failed to sync channel ${ch.title}: ${e.message}`);
      }
    }
    return { success: true, syncedCount: count };
  }

  isChannelOAuth(c: any): boolean {
    if (!c) return false;
    return Boolean(
      (c.accessToken && String(c.accessToken).trim()) ||
      (c.refreshToken && String(c.refreshToken).trim()) ||
      (c.googleAccountEmail && String(c.googleAccountEmail).trim())
    );
  }

  async getChannels(): Promise<any[]> {
    const channels = await this.channelRepo.find({
      order: { createdAt: 'DESC' },
    });
    // Sanitize secret tokens before sending to frontend, and include authType & isOAuth
    return channels.map(({ accessToken, refreshToken, ...rest }) => {
      const isOAuth = this.isChannelOAuth({ accessToken, refreshToken, ...rest });
      return {
        ...rest,
        isOAuth,
        authType: isOAuth ? 'oauth' : 'identifier',
      };
    });
  }

  async getChannel(id: number): Promise<any> {
    const channel = await this.channelRepo.findOne({
      where: { id },
      relations: { videos: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    const { accessToken, refreshToken, ...rest } = channel;
    const isOAuth = this.isChannelOAuth(channel);
    return {
      ...rest,
      isOAuth,
      authType: isOAuth ? 'oauth' : 'identifier',
    };
  }

  async disconnectChannel(id: number): Promise<{ success: boolean; message: string }> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    await this.channelRepo.delete(id);
    return { success: true, message: `Channel "${channel.title}" disconnected.` };
  }

  private getDateRangeThreshold(range?: string): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let days = 28; // Default to 28 days

    if (range === '7d') days = 7;
    else if (range === '28d') days = 28;
    else if (range === '90d') days = 90;
    else if (range === '1y') days = 365;

    const startObj = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDate = startObj.toISOString().split('T')[0];

    return { startDate, endDate };
  }

  async refreshLiveChannelStats(channel: YouTubeChannel): Promise<void> {
    // Only refresh if lastSyncedAt was more than 30 seconds ago to prevent rate limits
    if (channel.lastSyncedAt && Date.now() - new Date(channel.lastSyncedAt).getTime() < 30000) {
      return;
    }
    try {
      if (channel.accessToken || channel.refreshToken) {
        const authClient = await this.getAuthenticatedClient(channel);
        const youtube = google.youtube({ version: 'v3', auth: authClient });
        const res = await youtube.channels.list({
          part: ['statistics', 'snippet', 'contentDetails'],
          id: [channel.channelId],
        });
        if (res.data.items && res.data.items.length > 0) {
          const item = res.data.items[0];
          const prevSubCount = Number(channel.subscribers || 0);
          const newSubCount = Number(item.statistics?.subscriberCount || channel.subscribers);
          const subDiff = newSubCount - prevSubCount;
          channel.subscribers = newSubCount;
          channel.totalViews = String(item.statistics?.viewCount || channel.totalViews);
          channel.totalVideos = Number(item.statistics?.videoCount || channel.totalVideos);
          channel.lastSyncedAt = new Date().toISOString();
          await this.channelRepo.save(channel);
          await this.ensureRealtimeDailyAnalytics(channel, subDiff);
        }
      } else if (process.env.YOUTUBE_API_KEY) {
        const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
        const res = await youtube.channels.list({
          part: ['statistics', 'snippet'],
          id: [channel.channelId],
        });
        if (res.data.items && res.data.items.length > 0) {
          const item = res.data.items[0];
          const prevSubCount = Number(channel.subscribers || 0);
          const newSubCount = Number(item.statistics?.subscriberCount || channel.subscribers);
          const subDiff = newSubCount - prevSubCount;
          channel.subscribers = newSubCount;
          channel.totalViews = String(item.statistics?.viewCount || channel.totalViews);
          channel.totalVideos = Number(item.statistics?.videoCount || channel.totalVideos);
          channel.lastSyncedAt = new Date().toISOString();
          await this.channelRepo.save(channel);
          await this.ensureRealtimeDailyAnalytics(channel, subDiff);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Live channel stats refresh failed for ${channel.title}: ${e.message}`);
    }
  }

  async ensureRealtimeDailyAnalytics(channel: YouTubeChannel, subDiff = 0): Promise<void> {
    const isOAuth = this.isChannelOAuth(channel);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Aggregate live metrics from channel videos
    const videos = await this.videoRepo.find({
      where: { channel: { id: channel.id } },
    });
    let liveLikes = 0;
    let liveComments = 0;
    let liveVideoViews = 0;
    for (const v of videos) {
      liveLikes += Number(v.likes || 0);
      liveComments += Number(v.comments || 0);
      liveVideoViews += Number(v.views || 0);
    }

    // If NOT OAuth, do NOT forge historical filler rows or fake subscriber gains
    if (!isOAuth) {
      // For identifier channels, only track real live deltas detected during active monitoring
      let todayRecord = await this.analyticsRepo.findOne({
        where: { channel: { id: channel.id }, date: todayStr },
      });

      const todayGained = subDiff > 0 ? subDiff : 0;
      const todayLost = subDiff < 0 ? Math.abs(subDiff) : 0;

      if (todayRecord) {
        if (todayGained > 0) todayRecord.subscribersGained += todayGained;
        if (todayLost > 0) todayRecord.subscribersLost += todayLost;
        todayRecord.likes = liveLikes;
        todayRecord.comments = liveComments;
        if (liveVideoViews > todayRecord.views) {
          todayRecord.views = liveVideoViews;
        }
        await this.analyticsRepo.save(todayRecord);
      } else if (subDiff !== 0 || liveVideoViews > 0) {
        todayRecord = this.analyticsRepo.create({
          date: todayStr,
          views: liveVideoViews,
          watchTimeMinutes: 0,
          averageViewDurationSeconds: 0,
          likes: liveLikes,
          comments: liveComments,
          shares: 0,
          subscribersGained: todayGained,
          subscribersLost: todayLost,
          channel,
        });
        await this.analyticsRepo.save(todayRecord);
      }
      return;
    }

    // For OAuth channels:
    // Check historical sum of subscribers gained
    const historicalStats = await this.analyticsRepo
      .createQueryBuilder('a')
      .where('a.channelId = :cId AND a.date != :today', { cId: channel.id, today: todayStr })
      .select('SUM(a.subscribersGained)', 'sumGained')
      .addSelect('MAX(a.date)', 'lastDate')
      .getRawOne();

    const sumHistoricalGained = Number(historicalStats?.sumGained || 0);
    const lastReportDate = historicalStats?.lastDate;

    // Fill missing intermediate days between lastReportDate and today
    if (lastReportDate) {
      const lastD = new Date(lastReportDate);
      const currD = new Date(lastD.getTime() + 24 * 60 * 60 * 1000);
      const todayD = new Date(todayStr);

      while (currD < todayD) {
        const intermediateDateStr = currD.toISOString().split('T')[0];
        let intermediateRow = await this.analyticsRepo.findOne({
          where: { channel: { id: channel.id }, date: intermediateDateStr },
        });
        if (!intermediateRow) {
          intermediateRow = this.analyticsRepo.create({
            date: intermediateDateStr,
            views: 0,
            watchTimeMinutes: 0,
            averageViewDurationSeconds: 0,
            likes: liveLikes,
            comments: liveComments,
            shares: 0,
            subscribersGained: 0,
            subscribersLost: 0,
            channel,
          });
          await this.analyticsRepo.save(intermediateRow);
        }
        currD.setDate(currD.getDate() + 1);
      }
    }

    // Now handle TODAY's real-time live record
    let todayRecord = await this.analyticsRepo.findOne({
      where: { channel: { id: channel.id }, date: todayStr },
    });

    const todayGained = subDiff > 0 ? subDiff : 0;
    const todayLost = subDiff < 0 ? Math.abs(subDiff) : 0;

    if (todayRecord) {
      if (todayGained > 0) {
        todayRecord.subscribersGained += todayGained;
      }
      if (todayLost > 0) {
        todayRecord.subscribersLost += todayLost;
      }
      todayRecord.likes = liveLikes > 0 ? liveLikes : todayRecord.likes;
      todayRecord.comments = liveComments > 0 ? liveComments : todayRecord.comments;
      if (liveVideoViews > todayRecord.views) {
        todayRecord.views = liveVideoViews;
      }
      await this.analyticsRepo.save(todayRecord);
    } else {
      todayRecord = this.analyticsRepo.create({
        date: todayStr,
        views: liveVideoViews,
        watchTimeMinutes: 0,
        averageViewDurationSeconds: 0,
        likes: liveLikes,
        comments: liveComments,
        shares: 0,
        subscribersGained: todayGained,
        subscribersLost: todayLost,
        channel,
      });
      await this.analyticsRepo.save(todayRecord);
    }
  }

  async getOverview(channelId?: string, range?: string): Promise<any> {
    const channels = await this.channelRepo.find({
      relations: { videos: true },
    });

    const isAll = !channelId || channelId === 'all';
    const targetChannels = isAll ? channels : channels.filter((c) => String(c.id) === String(channelId) || c.channelId === channelId);

    if (targetChannels.length === 0 && !isAll) {
      throw new NotFoundException('Selected channel not found');
    }

    // Determine OAuth status & permissions
    const anyOAuth = targetChannels.some((c) => this.isChannelOAuth(c));
    const allOAuth = targetChannels.length > 0 && targetChannels.every((c) => this.isChannelOAuth(c));
    const hasAnalyticsAccess = anyOAuth;
    const authType = allOAuth ? 'oauth' : anyOAuth ? 'mixed' : 'identifier';

    // Refresh live stats & ensure real-time analytics
    for (const c of targetChannels) {
      await this.refreshLiveChannelStats(c);
      await this.ensureRealtimeDailyAnalytics(c);
    }

    // Baseline Totals from Channel Stats
    let totalSubscribers = 0;
    let totalViewsNum = 0;
    let totalVideos = 0;

    for (const c of targetChannels) {
      totalSubscribers += Number(c.subscribers || 0);
      totalViewsNum += Number(c.totalViews || 0);
      totalVideos += Number(c.totalVideos || 0);
    }

    // Analytics Aggregates over the selected date range
    const { startDate, endDate } = this.getDateRangeThreshold(range);

    const query = this.analyticsRepo.createQueryBuilder('analytics')
      .where('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (!isAll && targetChannels.length > 0) {
      query.andWhere('analytics.channelId = :targetId', { targetId: targetChannels[0].id });
    }

    const rawAggregates = await query
      .select('SUM(analytics.views)', 'views')
      .addSelect('SUM(analytics.watchTimeMinutes)', 'watchTimeMinutes')
      .addSelect('AVG(analytics.averageViewDurationSeconds)', 'averageViewDurationSeconds')
      .addSelect('SUM(analytics.likes)', 'likes')
      .addSelect('SUM(analytics.comments)', 'comments')
      .addSelect('SUM(analytics.shares)', 'shares')
      .addSelect('SUM(analytics.subscribersGained)', 'subscribersGained')
      .addSelect('SUM(analytics.subscribersLost)', 'subscribersLost')
      .getRawOne();

    const rangeViews = Number(rawAggregates?.views || 0);
    const watchTimeMinutes = Number(rawAggregates?.watchTimeMinutes || 0);
    const watchTimeHours = Math.round((watchTimeMinutes / 60) * 10) / 10;
    const averageViewDurationSeconds = Math.round(Number(rawAggregates?.averageViewDurationSeconds || 0));
    const likes = Number(rawAggregates?.likes || 0);
    const comments = Number(rawAggregates?.comments || 0);
    const shares = Number(rawAggregates?.shares || 0);
    const subscribersGained = Number(rawAggregates?.subscribersGained || 0);
    const subscribersLost = Number(rawAggregates?.subscribersLost || 0);
    const netSubscribers = subscribersGained - subscribersLost;

    // Aggregates from stored videos
    let totalStoredVideoLikes = 0;
    let totalStoredVideoComments = 0;
    let totalStoredVideoViews = 0;

    for (const c of targetChannels) {
      for (const v of c.videos || []) {
        totalStoredVideoLikes += Number(v.likes || 0);
        totalStoredVideoComments += Number(v.comments || 0);
        totalStoredVideoViews += Number(v.views || 0);
      }
    }

    return {
      channelId: isAll ? 'all' : targetChannels[0].id,
      channelTitle: isAll ? 'All Connected Channels' : targetChannels[0].title,
      authType,
      hasAnalyticsAccess,
      isOAuth: anyOAuth,
      subscribers: totalSubscribers,
      totalViews: totalViewsNum > 0 ? totalViewsNum : totalStoredVideoViews,
      totalVideos: totalVideos,
      periodViews: hasAnalyticsAccess && rangeViews > 0 ? rangeViews : (totalViewsNum > 0 ? totalViewsNum : totalStoredVideoViews),
      // If no OAuth access, DO NOT show fake 0 watch time, fake churn, or fake shares:
      watchTimeHours: hasAnalyticsAccess ? watchTimeHours : null,
      watchTimeMinutes: hasAnalyticsAccess ? watchTimeMinutes : null,
      averageViewDurationSeconds: hasAnalyticsAccess ? averageViewDurationSeconds : null,
      likes: likes > 0 ? likes : totalStoredVideoLikes,
      comments: comments > 0 ? comments : totalStoredVideoComments,
      shares: hasAnalyticsAccess ? shares : null,
      subscribersGained: hasAnalyticsAccess ? subscribersGained : null,
      subscribersLost: hasAnalyticsAccess ? subscribersLost : null,
      netSubscribers: hasAnalyticsAccess ? netSubscribers : null,
      connectedChannelsCount: channels.length,
      channels: targetChannels.map(({ accessToken, refreshToken, ...rest }) => {
        const isOAuth = this.isChannelOAuth({ accessToken, refreshToken, ...rest });
        return {
          ...rest,
          isOAuth,
          authType: isOAuth ? 'oauth' : 'identifier',
        };
      }),
    };
  }

  async getAnalyticsTimeseries(channelId?: string, range?: string): Promise<any[]> {
    const { startDate, endDate } = this.getDateRangeThreshold(range);
    const isAll = !channelId || channelId === 'all';

    const channels = await this.channelRepo.find({ relations: { videos: true } });
    const targetChannels = isAll ? channels : channels.filter((c) => String(c.id) === String(channelId) || c.channelId === channelId);

    const anyOAuth = targetChannels.some((c) => this.isChannelOAuth(c));

    for (const c of targetChannels) {
      await this.ensureRealtimeDailyAnalytics(c);
    }

    const query = this.analyticsRepo.createQueryBuilder('analytics')
      .where('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (!isAll && targetChannels.length > 0) {
      query.andWhere('analytics.channelId = :targetId', { targetId: targetChannels[0].id });
    }

    const rows = await query
      .select('analytics.date', 'date')
      .addSelect('SUM(analytics.views)', 'views')
      .addSelect('SUM(analytics.watchTimeMinutes)', 'watchTimeMinutes')
      .addSelect('AVG(analytics.averageViewDurationSeconds)', 'averageViewDurationSeconds')
      .addSelect('SUM(analytics.likes)', 'likes')
      .addSelect('SUM(analytics.comments)', 'comments')
      .addSelect('SUM(analytics.shares)', 'shares')
      .addSelect('SUM(analytics.subscribersGained)', 'subscribersGained')
      .addSelect('SUM(analytics.subscribersLost)', 'subscribersLost')
      .groupBy('analytics.date')
      .orderBy('analytics.date', 'ASC')
      .getRawMany();

    // If there are NO rows at all and channel has no OAuth access, return empty list (no fake filler)
    if (rows.length === 0 && !anyOAuth) {
      return [];
    }

    const rowMap = new Map<string, any>();
    for (const r of rows) {
      const gained = Number(r.subscribersGained || 0);
      const lost = Number(r.subscribersLost || 0);
      const wtMins = Number(r.watchTimeMinutes || 0);
      rowMap.set(r.date, {
        date: r.date,
        views: Number(r.views || 0),
        watchTimeMinutes: anyOAuth ? wtMins : null,
        watchTimeHours: anyOAuth ? Math.round((wtMins / 60) * 10) / 10 : null,
        averageViewDurationSeconds: anyOAuth ? Math.round(Number(r.averageViewDurationSeconds || 0)) : null,
        likes: Number(r.likes || 0),
        comments: Number(r.comments || 0),
        shares: anyOAuth ? Number(r.shares || 0) : null,
        subscribersGained: anyOAuth ? gained : null,
        subscribersLost: anyOAuth ? lost : null,
        netSubscribers: anyOAuth ? (gained - lost) : null,
        hasAnalyticsAccess: anyOAuth,
      });
    }

    // If target has OAuth access, fill continuous dates for proper charts
    if (anyOAuth) {
      const result: any[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dStr = current.toISOString().split('T')[0];
        if (rowMap.has(dStr)) {
          result.push(rowMap.get(dStr));
        } else {
          result.push({
            date: dStr,
            views: 0,
            watchTimeMinutes: 0,
            watchTimeHours: 0,
            averageViewDurationSeconds: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            subscribersGained: 0,
            subscribersLost: 0,
            netSubscribers: 0,
            hasAnalyticsAccess: true,
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return result;
    }

    // For non-OAuth, only return dates where real video telemetry was captured
    return Array.from(rowMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getVideos(params: {
    channelId?: string;
    search?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const { channelId, search, sort = 'publishedAt', order = 'DESC', page = 1, limit = 10 } = params;

    const query = this.videoRepo.createQueryBuilder('video')
      .leftJoinAndSelect('video.channel', 'channel');

    if (channelId && channelId !== 'all') {
      const numId = Number(channelId);
      if (!isNaN(numId)) {
        query.andWhere('(channel.id = :numId OR channel.channelId = :channelIdStr)', {
          numId,
          channelIdStr: String(channelId),
        });
      } else {
        const cleanHandle = String(channelId).replace(/^@/, '');
        query.andWhere(
          '(channel.channelId = :rawId OR channel.customUrl = :rawId OR channel.customUrl = :handleId)',
          {
            rawId: String(channelId),
            handleId: `@${cleanHandle}`,
          },
        );
      }
    }

    if (search && search.trim()) {
      query.andWhere('(video.title ILIKE :search OR video.description ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    const sortColumn = ['views', 'likes', 'comments', 'publishedAt'].includes(sort)
      ? `video.${sort}`
      : 'video.publishedAt';

    query.orderBy(sortColumn, order);
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    // Sanitize channel inside videos
    const safeItems = items.map((v) => ({
      ...v,
      channel: v.channel
        ? {
            id: v.channel.id,
            channelId: v.channel.channelId,
            title: v.channel.title,
            thumbnailUrl: v.channel.thumbnailUrl,
            customUrl: v.channel.customUrl,
          }
        : null,
    }));

    return {
      items: safeItems,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
