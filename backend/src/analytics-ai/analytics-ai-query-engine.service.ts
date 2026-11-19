import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../account.entity';
import { Analytics } from '../analytics.entity';
import { Post } from '../post.entity';
import { User } from '../user.entity';
import { YouTubeChannel } from '../youtube/youtube-channel.entity';
import { YouTubeVideo } from '../youtube/youtube-video.entity';
import { YouTubeAnalytics } from '../youtube/youtube-analytics.entity';
import {
  UserContext,
  StructuredInterpretation,
  QueryExecutionResult,
  PeriodComparisonData,
  ChartData,
  AnalyticsMetric,
} from './analytics-ai.types';

@Injectable()
export class AnalyticsAiQueryEngineService {
  private readonly logger = new Logger(AnalyticsAiQueryEngineService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Analytics)
    private readonly analyticsRepo: Repository<Analytics>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(YouTubeChannel)
    private readonly channelRepo: Repository<YouTubeChannel>,
    @InjectRepository(YouTubeVideo)
    private readonly videoRepo: Repository<YouTubeVideo>,
    @InjectRepository(YouTubeAnalytics)
    private readonly ytAnalyticsRepo: Repository<YouTubeAnalytics>,
  ) {}

  /**
   * Enforces tenancy and workspace isolation.
   * Throws ForbiddenException if a user attempts to access an account/channel outside their permitted scope.
   */
  private enforceWorkspaceScope(
    targetType: 'account' | 'channel',
    targetId: number | undefined,
    userContext?: UserContext,
  ) {
    if (!userContext || userContext.role === 'super_admin') {
      return; // Super admins possess global workspace observability
    }

    if (userContext.role === 'manager') {
      if (targetType === 'account' && targetId) {
        if (
          userContext.allowedAccountIds &&
          userContext.allowedAccountIds.length > 0 &&
          !userContext.allowedAccountIds.includes(targetId)
        ) {
          throw new ForbiddenException(
            `Access denied: Manager is not authorized to query LinkedIn account #${targetId}.`,
          );
        }
      }

      if (targetType === 'channel' && targetId) {
        if (
          userContext.allowedChannelIds &&
          userContext.allowedChannelIds.length > 0 &&
          !userContext.allowedChannelIds.includes(targetId)
        ) {
          throw new ForbiddenException(
            `Access denied: Manager is not authorized to query YouTube channel #${targetId}.`,
          );
        }
      }
    }
  }

  /**
   * Helper to retrieve all connected channel and account metadata for entity resolution.
   */
  async getAllConnectedEntities(userContext?: UserContext): Promise<{
    channels: { id: number; title: string; customUrl: string; channelId: string }[];
    accounts: { id: number; username: string; platform: string }[];
  }> {
    const qbCh = this.channelRepo.createQueryBuilder('c').select(['c.id', 'c.title', 'c.customUrl', 'c.channelId']);
    if (userContext?.role === 'manager' && userContext.allowedChannelIds?.length) {
      qbCh.andWhere('c.id IN (:...ids)', { ids: userContext.allowedChannelIds });
    }
    const channels = await qbCh.getMany();

    const qbAcc = this.accountRepo.createQueryBuilder('a').select(['a.id', 'a.username', 'a.platform']);
    if (userContext?.role === 'manager' && userContext.allowedAccountIds?.length) {
      qbAcc.andWhere('a.id IN (:...ids)', { ids: userContext.allowedAccountIds });
    }
    const accounts = await qbAcc.getMany();

    return {
      channels: channels.map((c) => ({
        id: c.id,
        title: c.title,
        customUrl: c.customUrl,
        channelId: c.channelId,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        username: a.username,
        platform: a.platform,
      })),
    };
  }

  /**
   * Execute read-only query based on validated structured interpretation.
   */
  async executeQuery(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const { operation, platform, metric, dateRange, limit, targetId, targetIdentifier } =
      interpretation;

    this.logger.log(
      `[QueryEngine] Executing ${operation} for platform=${platform}, metric=${metric}, range=${dateRange.type}, target=${targetIdentifier || targetId || 'none'}`,
    );

    // If query targets a specific channel or account and is asking for general stats/summary
    if (
      operation === 'entity_detail' ||
      ((operation === 'summary' || operation === 'ranking') &&
        (targetId || targetIdentifier) &&
        interpretation.groupBy !== 'post' &&
        interpretation.groupBy !== 'video')
    ) {
      return this.getSpecificEntityPerformance(interpretation, userContext);
    }

    const notes: string[] = [];

    switch (operation) {
      case 'ranking':
        if (interpretation.groupBy === 'post') {
          return this.getPostRankings(metric, interpretation, userContext);
        } else if (interpretation.groupBy === 'video') {
          return this.getVideoRankings(metric, interpretation, userContext);
        } else {
          return this.getChannelRankings(platform, metric, interpretation, userContext);
        }

      case 'comparison':
        return this.getPeriodComparison(interpretation, userContext);

      case 'timeseries_trend':
        return this.getTimeseriesTrend(interpretation, userContext);

      case 'investigation':
        return this.getEngagementInvestigation(interpretation, userContext);

      case 'summary':
      default:
        return this.getWorkspaceSummary(interpretation, userContext);
    }
  }

  /**
   * 1. Channel Rankings (YouTube Channels & LinkedIn Accounts)
   */
  async getChannelRankings(
    platform: 'linkedin' | 'youtube' | 'all',
    metric: AnalyticsMetric,
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    if (interpretation.targetId) {
      this.enforceWorkspaceScope(
        platform === 'linkedin' ? 'account' : 'channel',
        interpretation.targetId,
        userContext,
      );
    }

    const records: any[] = [];
    const notes: string[] = [];
    const limit = Math.min(Math.max(interpretation.limit || 5, 1), 20);

    // YouTube Channels
    if (platform === 'youtube' || platform === 'all') {
      const qb = this.channelRepo
        .createQueryBuilder('c')
        .select([
          'c.id',
          'c.channelId',
          'c.title',
          'c.customUrl',
          'c.subscribers',
          'c.totalViews',
          'c.totalVideos',
          'c.status',
          'c.publishedAt',
        ]);

      if (userContext?.role === 'manager' && userContext.allowedChannelIds?.length) {
        qb.andWhere('c.id IN (:...chIds)', { chIds: userContext.allowedChannelIds });
      }

      if (interpretation.targetId) {
        qb.andWhere('c.id = :tid', { tid: interpretation.targetId });
      } else if (interpretation.targetIdentifier) {
        qb.andWhere('(c.title ILIKE :tIden OR c.customUrl ILIKE :tIden)', {
          tIden: `%${interpretation.targetIdentifier}%`,
        });
      }

      const channels = await qb.getMany();

      // If ranking by period gains (e.g. subscribers gained this month or views this month)
      if (
        interpretation.dateRange.type === 'this_month' ||
        interpretation.dateRange.type === 'last_month' ||
        interpretation.dateRange.type === '30d' ||
        interpretation.dateRange.type === '7d'
      ) {
        for (const ch of channels) {
          const agg = await this.ytAnalyticsRepo
            .createQueryBuilder('ya')
            .where('ya.channelId = :chId', { chId: ch.id })
            .andWhere('ya.date BETWEEN :sDate AND :eDate', {
              sDate: interpretation.dateRange.startDate,
              eDate: interpretation.dateRange.endDate,
            })
            .select('SUM(ya.views)', 'periodViews')
            .addSelect('SUM(ya.watchTimeMinutes)', 'periodWatchTime')
            .addSelect('SUM(ya.subscribersGained)', 'periodSubsGained')
            .addSelect('SUM(ya.subscribersLost)', 'periodSubsLost')
            .addSelect('SUM(ya.likes)', 'periodLikes')
            .addSelect('SUM(ya.comments)', 'periodComments')
            .getRawOne();

          const gained = Number(agg?.periodSubsGained || 0);
          const lost = Number(agg?.periodSubsLost || 0);
          const pViews = Number(agg?.periodViews || 0);

          records.push({
            id: ch.id,
            platform: 'YouTube',
            name: ch.title,
            identifier: ch.customUrl || ch.channelId,
            subscribers: Number(ch.subscribers || 0),
            totalViews: Number(ch.totalViews || 0),
            totalVideos: Number(ch.totalVideos || 0),
            periodViews: pViews,
            periodSubscribersGained: gained,
            periodSubscribersLost: lost,
            netSubscribersGrowth: gained - lost,
            periodLikes: Number(agg?.periodLikes || 0),
            periodComments: Number(agg?.periodComments || 0),
            watchTimeMinutes: Number(agg?.periodWatchTime || 0),
            rankingMetric:
              metric === 'subscribers' || metric === 'followers'
                ? gained
                : metric === 'views'
                ? pViews
                : Number(ch.subscribers || 0),
          });
        }
      } else {
        // Lifetime metrics
        for (const ch of channels) {
          records.push({
            id: ch.id,
            platform: 'YouTube',
            name: ch.title,
            identifier: ch.customUrl || ch.channelId,
            subscribers: Number(ch.subscribers || 0),
            totalViews: Number(ch.totalViews || 0),
            totalVideos: Number(ch.totalVideos || 0),
            rankingMetric:
              metric === 'views'
                ? Number(ch.totalViews || 0)
                : Number(ch.subscribers || 0),
          });
        }
      }
    }

    // LinkedIn Accounts
    if (platform === 'linkedin' || platform === 'all') {
      const qb = this.accountRepo
        .createQueryBuilder('a')
        .select(['a.id', 'a.platform', 'a.username', 'a.profileUrl', 'a.status']);

      if (userContext?.role === 'manager' && userContext.allowedAccountIds?.length) {
        qb.andWhere('a.id IN (:...accIds)', { accIds: userContext.allowedAccountIds });
      }

      if (interpretation.targetId) {
        qb.andWhere('a.id = :aid', { aid: interpretation.targetId });
      } else if (interpretation.targetIdentifier) {
        qb.andWhere('a.username ILIKE :aIden', {
          aIden: `%${interpretation.targetIdentifier}%`,
        });
      }

      const accounts = await qb.getMany();

      for (const acc of accounts) {
        // Fetch latest analytics snapshot for followers and views
        const latestAnalytics = await this.analyticsRepo.findOne({
          where: { account: { id: acc.id } },
          order: { date: 'DESC', id: 'DESC' },
        });

        // Count posts
        const postCount = await this.postRepo.count({
          where: { account: { id: acc.id } },
        });

        const followers = Number(latestAnalytics?.followers || 0);
        const views = Number(latestAnalytics?.views || 0);

        records.push({
          id: acc.id,
          platform: 'LinkedIn',
          name: acc.username,
          identifier: `@${acc.username}`,
          followers,
          subscribers: followers,
          views,
          totalViews: views,
          totalPosts: postCount,
          profileUrl: acc.profileUrl,
          rankingMetric: metric === 'views' ? views : followers,
        });
      }
    }

    // Sort records by rankingMetric DESC
    records.sort((a, b) => (b.rankingMetric || 0) - (a.rankingMetric || 0));
    const sliced = records.slice(0, limit);

    if (platform === 'linkedin' && records.some((r) => r.views === 0)) {
      notes.push(
        'LinkedIn impressions on personal profiles are subject to platform privacy rules; follower counts reflect scraped profile figures.',
      );
    }

    return {
      operation: 'ranking',
      platform,
      primaryMetric: metric,
      records: sliced,
      dataQualityNotes: notes,
    };
  }

  /**
   * 2. Post Rankings (LinkedIn Posts)
   */
  async getPostRankings(
    metric: AnalyticsMetric,
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    if (interpretation.targetId) {
      this.enforceWorkspaceScope('account', interpretation.targetId, userContext);
    }

    const limit = Math.min(Math.max(interpretation.limit || 5, 1), 20);
    const notes: string[] = [];

    const qb = this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.account', 'account')
      .select([
        'p.id',
        'p.content',
        'p.author',
        'p.postUrl',
        'p.createdAt',
        'p.postDate',
        'p.likes',
        'p.comments',
        'p.shares',
        'p.impressions',
        'account.id',
        'account.username',
      ]);

    if (userContext?.role === 'manager' && userContext.allowedAccountIds?.length) {
      qb.andWhere('account.id IN (:...accIds)', { accIds: userContext.allowedAccountIds });
    }

    if (interpretation.targetId) {
      qb.andWhere('account.id = :accId', { accId: interpretation.targetId });
    } else if (interpretation.targetIdentifier) {
      qb.andWhere('(account.username ILIKE :iden OR p.author ILIKE :iden)', {
        iden: `%${interpretation.targetIdentifier}%`,
      });
    }

    // Date range filter if requested (e.g. last 30 days)
    if (
      interpretation.dateRange.type !== 'all' &&
      interpretation.dateRange.startDate &&
      interpretation.dateRange.endDate
    ) {
      qb.andWhere('p.createdAt >= :sDate AND p.createdAt <= :eDate', {
        sDate: `${interpretation.dateRange.startDate}T00:00:00.000Z`,
        eDate: `${interpretation.dateRange.endDate}T23:59:59.999Z`,
      });
    }

    // Sorting rule
    if (metric === 'comments') {
      qb.orderBy('p.comments', 'DESC');
    } else if (metric === 'likes') {
      qb.orderBy('p.likes', 'DESC');
    } else if (metric === 'shares') {
      qb.orderBy('p.shares', 'DESC');
    } else if (metric === 'impressions') {
      qb.orderBy('p.impressions', 'DESC');
    } else {
      // Default to Total Engagement = likes + comments + shares
      qb.addSelect('p.likes + p.comments + p.shares', 'total_eng')
        .orderBy('total_eng', 'DESC');
    }

    const posts = await qb.take(limit).getMany();

    const formattedRecords = posts.map((p, idx) => {
      const likes = Number(p.likes || 0);
      const comments = Number(p.comments || 0);
      const shares = Number(p.shares || 0);
      const impressions = Number(p.impressions || 0);
      const totalEngagement = likes + comments + shares;

      // Transparent engagement calculation
      let engagementRate: string = 'N/A';
      if (impressions > 0) {
        engagementRate = `${(((totalEngagement) / impressions) * 100).toFixed(2)}%`;
      }

      return {
        rank: idx + 1,
        id: p.id,
        contentSnippet: p.content ? p.content.slice(0, 140) + (p.content.length > 140 ? '...' : '') : '',
        author: p.author || p.account?.username || 'LinkedIn Creator',
        accountUsername: p.account?.username || 'Unknown',
        likes,
        comments,
        shares,
        impressions,
        totalEngagement,
        engagementRate,
        publishedAt: p.createdAt ? p.createdAt.split('T')[0] : p.postDate || 'Recent',
        postUrl: p.postUrl || `https://www.linkedin.com/feed/update/${p.id}`,
      };
    });

    if (formattedRecords.some((r) => r.impressions === 0)) {
      notes.push(
        'Formula: Engagement = Reactions + Comments + Reposts. Post impressions are restricted by LinkedIn privacy for standard scraped profiles and are reported as 0 where unavailable.',
      );
    }

    return {
      operation: 'ranking',
      platform: 'linkedin',
      primaryMetric: metric,
      records: formattedRecords,
      dataQualityNotes: notes,
    };
  }

  /**
   * 3. Video Rankings (YouTube Videos)
   */
  async getVideoRankings(
    metric: AnalyticsMetric,
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    if (interpretation.targetId) {
      this.enforceWorkspaceScope('channel', interpretation.targetId, userContext);
    }

    const limit = Math.min(Math.max(interpretation.limit || 5, 1), 20);
    const notes: string[] = [];

    const qb = this.videoRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.channel', 'channel')
      .select([
        'v.id',
        'v.videoId',
        'v.title',
        'v.publishedAt',
        'v.duration',
        'v.views',
        'v.likes',
        'v.comments',
        'channel.id',
        'channel.title',
        'channel.customUrl',
      ]);

    if (userContext?.role === 'manager' && userContext.allowedChannelIds?.length) {
      qb.andWhere('channel.id IN (:...chIds)', { chIds: userContext.allowedChannelIds });
    }

    if (interpretation.targetId) {
      qb.andWhere('channel.id = :chId', { chId: interpretation.targetId });
    } else if (interpretation.targetIdentifier) {
      qb.andWhere('(channel.title ILIKE :cIden OR channel.customUrl ILIKE :cIden)', {
        cIden: `%${interpretation.targetIdentifier}%`,
      });
    }

    // Date range filter if requested (e.g. published during last 7 days or 30 days)
    if (
      interpretation.dateRange.type !== 'all' &&
      interpretation.dateRange.startDate &&
      interpretation.dateRange.endDate
    ) {
      qb.andWhere('v.publishedAt >= :sDate AND v.publishedAt <= :eDate', {
        sDate: `${interpretation.dateRange.startDate}T00:00:00Z`,
        eDate: `${interpretation.dateRange.endDate}T23:59:59Z`,
      });
    }

    // Sort order
    if (metric === 'likes') {
      qb.orderBy('v.likes', 'DESC');
    } else if (metric === 'comments') {
      qb.orderBy('v.comments', 'DESC');
    } else if (metric === 'engagement') {
      qb.addSelect('v.likes + v.comments', 'total_eng')
        .orderBy('total_eng', 'DESC');
    } else {
      // Default to Views
      qb.orderBy('v.views', 'DESC');
    }

    let videos = await qb.take(limit).getMany();

    // If date filtering returned 0 records because all videos were published prior to the range,
    // fallback gracefully to all-time top videos but note the publication dates.
    if (videos.length === 0 && interpretation.dateRange.type !== 'all') {
      notes.push(
        `No videos published strictly between ${interpretation.dateRange.startDate} and ${interpretation.dateRange.endDate}. Displaying top performing videos across all published uploads instead.`,
      );
      const fallbackQb = this.videoRepo
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.channel', 'channel')
        .orderBy('v.views', 'DESC')
        .take(limit);
      videos = await fallbackQb.getMany();
    }

    const formattedRecords = videos.map((v, idx) => {
      const views = Number(v.views || 0);
      const likes = Number(v.likes || 0);
      const comments = Number(v.comments || 0);
      const engagement = likes + comments;
      const engagementRate =
        views > 0 ? `${(((engagement) / views) * 100).toFixed(2)}%` : '0.00%';

      return {
        rank: idx + 1,
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channel?.title || 'Unknown Channel',
        views,
        likes,
        comments,
        duration: v.duration || '00:00',
        engagementRate,
        publishedAt: v.publishedAt ? v.publishedAt.split('T')[0] : 'Unknown',
        videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      };
    });

    return {
      operation: 'ranking',
      platform: 'youtube',
      primaryMetric: metric,
      records: formattedRecords,
      dataQualityNotes: notes,
    };
  }

  /**
   * 4. Period Comparison (This Month vs Last Month, 7d vs Prev 7d, 30d vs Prev 30d)
   */
  async getPeriodComparison(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const { platform, dateRange } = interpretation;
    const notes: string[] = [];
    const comparisons: PeriodComparisonData[] = [];

    const curStart = dateRange.startDate;
    const curEnd = dateRange.endDate;
    const prevStart = dateRange.compareStartDate || curStart;
    const prevEnd = dateRange.compareEndDate || curEnd;

    const curLabel = dateRange.label;
    const prevLabel = dateRange.compareLabel || 'Previous Period';

    // Helper for safe percentage change calculation
    const calcDiff = (
      cur: number,
      prev: number,
      name: string,
    ): PeriodComparisonData => {
      const absoluteChange = cur - prev;
      let percentageChange: number | null = null;
      let explanation = '';

      if (prev === 0) {
        percentageChange = null;
        explanation =
          cur === 0
            ? 'Metric remained 0 across both periods.'
            : `Baseline was 0 during ${prevLabel}; percentage growth cannot be mathematically calculated. Absolute growth is +${cur.toLocaleString()}.`;
      } else {
        percentageChange = Math.round(((cur - prev) / prev) * 1000) / 10;
        const sign = percentageChange > 0 ? '+' : '';
        explanation = `${sign}${percentageChange}% change (${prev.toLocaleString()} → ${cur.toLocaleString()})`;
      }

      return {
        metric: name,
        currentValue: cur,
        previousValue: prev,
        absoluteChange,
        percentageChange,
        currentLabel: curLabel,
        previousLabel: prevLabel,
        explanation,
      };
    };

    // YouTube Comparison
    if (platform === 'youtube' || platform === 'all') {
      const qCur = this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.date BETWEEN :sDate AND :eDate', { sDate: curStart, eDate: curEnd });

      const qPrev = this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.date BETWEEN :sDate AND :eDate', { sDate: prevStart, eDate: prevEnd });

      if (interpretation.targetId) {
        qCur.andWhere('ya.channelId = :chId', { chId: interpretation.targetId });
        qPrev.andWhere('ya.channelId = :chId', { chId: interpretation.targetId });
      }

      const curAgg = await qCur
        .select('SUM(ya.views)', 'views')
        .addSelect('SUM(ya.watchTimeMinutes)', 'watchTime')
        .addSelect('SUM(ya.likes)', 'likes')
        .addSelect('SUM(ya.comments)', 'comments')
        .addSelect('SUM(ya.shares)', 'shares')
        .addSelect('SUM(ya.subscribersGained)', 'subsGained')
        .addSelect('SUM(ya.subscribersLost)', 'subsLost')
        .getRawOne();

      const prevAgg = await qPrev
        .select('SUM(ya.views)', 'views')
        .addSelect('SUM(ya.watchTimeMinutes)', 'watchTime')
        .addSelect('SUM(ya.likes)', 'likes')
        .addSelect('SUM(ya.comments)', 'comments')
        .addSelect('SUM(ya.shares)', 'shares')
        .addSelect('SUM(ya.subscribersGained)', 'subsGained')
        .addSelect('SUM(ya.subscribersLost)', 'subsLost')
        .getRawOne();

      const curViews = Number(curAgg?.views || 0);
      const prevViews = Number(prevAgg?.views || 0);
      comparisons.push(calcDiff(curViews, prevViews, 'YouTube Views'));

      const curLikes = Number(curAgg?.likes || 0);
      const prevLikes = Number(prevAgg?.likes || 0);
      comparisons.push(calcDiff(curLikes, prevLikes, 'YouTube Likes'));

      const curComments = Number(curAgg?.comments || 0);
      const prevComments = Number(prevAgg?.comments || 0);
      comparisons.push(calcDiff(curComments, prevComments, 'YouTube Comments'));

      const curWatch = Number(curAgg?.watchTime || 0);
      const prevWatch = Number(prevAgg?.watchTime || 0);
      if (curWatch > 0 || prevWatch > 0) {
        comparisons.push(calcDiff(curWatch, prevWatch, 'YouTube Watch Time (mins)'));
      } else {
        notes.push(
          'YouTube watch time is currently 0 or tracked via public API. Connect YouTube Studio via Google OAuth to populate daily watch time minutes.',
        );
      }

      const curSubsGained = Number(curAgg?.subsGained || 0);
      const prevSubsGained = Number(prevAgg?.subsGained || 0);
      comparisons.push(calcDiff(curSubsGained, prevSubsGained, 'Subscribers Gained'));
    }

    // LinkedIn Comparison
    if (platform === 'linkedin' || platform === 'all') {
      const qCur = this.analyticsRepo
        .createQueryBuilder('a')
        .where('a.date BETWEEN :sDate AND :eDate', { sDate: curStart, eDate: curEnd });

      const qPrev = this.analyticsRepo
        .createQueryBuilder('a')
        .where('a.date BETWEEN :sDate AND :eDate', { sDate: prevStart, eDate: prevEnd });

      if (interpretation.targetId) {
        qCur.andWhere('a.accountId = :accId', { accId: interpretation.targetId });
        qPrev.andWhere('a.accountId = :accId', { accId: interpretation.targetId });
      }

      const curAgg = await qCur
        .select('SUM(a.likes)', 'likes')
        .addSelect('SUM(a.comments)', 'comments')
        .addSelect('SUM(a.shares)', 'shares')
        .addSelect('SUM(a.views)', 'views')
        .getRawOne();

      const prevAgg = await qPrev
        .select('SUM(a.likes)', 'likes')
        .addSelect('SUM(a.comments)', 'comments')
        .addSelect('SUM(a.shares)', 'shares')
        .addSelect('SUM(a.views)', 'views')
        .getRawOne();

      const curLikes = Number(curAgg?.likes || 0);
      const prevLikes = Number(prevAgg?.likes || 0);
      comparisons.push(calcDiff(curLikes, prevLikes, 'LinkedIn Reactions / Likes'));

      const curComments = Number(curAgg?.comments || 0);
      const prevComments = Number(prevAgg?.comments || 0);
      comparisons.push(calcDiff(curComments, prevComments, 'LinkedIn Comments'));

      const curShares = Number(curAgg?.shares || 0);
      const prevShares = Number(prevAgg?.shares || 0);
      comparisons.push(calcDiff(curShares, prevShares, 'LinkedIn Shares'));
    }

    return {
      operation: 'comparison',
      platform,
      primaryMetric: interpretation.metric,
      records: [],
      comparisons,
      dataQualityNotes: notes,
    };
  }

  /**
   * 5. Time-Series Trends (for Charts)
   */
  async getTimeseriesTrend(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const { platform, dateRange } = interpretation;
    const notes: string[] = [];

    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate;

    const chartPoints: Record<string, any>[] = [];

    if (platform === 'youtube' || platform === 'all') {
      const qb = this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.date BETWEEN :sDate AND :eDate', { sDate: startDate, eDate: endDate })
        .groupBy('ya.date')
        .orderBy('ya.date', 'ASC')
        .select('ya.date', 'date')
        .addSelect('SUM(ya.views)', 'views')
        .addSelect('SUM(ya.likes)', 'likes')
        .addSelect('SUM(ya.comments)', 'comments')
        .addSelect('SUM(ya.subscribersGained)', 'subscribersGained');

      if (interpretation.targetId) {
        qb.andWhere('ya.channelId = :chId', { chId: interpretation.targetId });
      }

      const rows = await qb.getRawMany();

      for (const r of rows) {
        chartPoints.push({
          date: r.date,
          views: Number(r.views || 0),
          likes: Number(r.likes || 0),
          comments: Number(r.comments || 0),
          subscribersGained: Number(r.subscribersGained || 0),
        });
      }
    }

    if (chartPoints.length === 0) {
      notes.push(
        `Limited time-series daily records between ${startDate} and ${endDate}. Displaying available snapshots.`,
      );
    }

    const chartData: ChartData = {
      type: 'area',
      title: `${interpretation.targetIdentifier || 'Workspace'} Daily Views & Activity Trend (${dateRange.label})`,
      xKey: 'date',
      dataKeys: [
        { key: 'views', name: 'Views', color: '#3b82f6' },
        { key: 'likes', name: 'Likes', color: '#10b981' },
        { key: 'comments', name: 'Comments', color: '#f59e0b' },
      ],
      data: chartPoints,
    };

    return {
      operation: 'timeseries_trend',
      platform,
      primaryMetric: interpretation.metric,
      records: chartPoints,
      chartData,
      dataQualityNotes: notes,
    };
  }

  /**
   * 6. Workspace Summary
   */
  async getWorkspaceSummary(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const notes: string[] = [];

    // YouTube Aggregates
    const ytChannels = await this.channelRepo.find();
    let totalYtSubscribers = 0;
    let totalYtViews = 0;
    let totalYtVideos = 0;

    for (const c of ytChannels) {
      totalYtSubscribers += Number(c.subscribers || 0);
      totalYtViews += Number(c.totalViews || 0);
      totalYtVideos += Number(c.totalVideos || 0);
    }

    // LinkedIn Aggregates
    const liAccounts = await this.accountRepo.find();
    const totalLiAccounts = liAccounts.length;
    let totalLiFollowers = 0;

    for (const a of liAccounts) {
      const snap = await this.analyticsRepo.findOne({
        where: { account: { id: a.id } },
        order: { date: 'DESC', id: 'DESC' },
      });
      totalLiFollowers += Number(snap?.followers || 0);
    }

    const totalLiPosts = await this.postRepo.count();

    // Top Video
    const topVideo = await this.videoRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.channel', 'channel')
      .orderBy('v.views', 'DESC')
      .take(1)
      .getOne();

    // Top Post
    const topPost = await this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.account', 'account')
      .addSelect('p.likes + p.comments + p.shares', 'top_eng')
      .orderBy('top_eng', 'DESC')
      .take(1)
      .getOne();

    const summaryMetrics = {
      totalYouTubeChannels: ytChannels.length,
      totalYouTubeSubscribers: totalYtSubscribers,
      totalYouTubeViews: totalYtViews,
      totalYouTubeVideos: totalYtVideos,
      totalLinkedInAccounts: totalLiAccounts,
      totalLinkedInFollowers: totalLiFollowers,
      totalLinkedInPosts: totalLiPosts,
      topVideoTitle: topVideo?.title || 'None',
      topVideoViews: Number(topVideo?.views || 0),
      topVideoUrl: topVideo ? `https://www.youtube.com/watch?v=${topVideo.videoId}` : null,
      topPostEngagement: topPost
        ? Number(topPost.likes || 0) + Number(topPost.comments || 0) + Number(topPost.shares || 0)
        : 0,
      topPostUrl: topPost?.postUrl || null,
    };

    return {
      operation: 'summary',
      platform: 'all',
      primaryMetric: 'overview',
      records: [summaryMetrics],
      summaryMetrics,
      dataQualityNotes: notes,
    };
  }

  /**
   * 7. Engagement Investigation & Data Observations
   */
  async getEngagementInvestigation(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const notes: string[] = [];

    // 1. Calculate Average Post Engagement across recent posts
    const recentPosts = await this.postRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    let totalEng = 0;
    for (const p of recentPosts) {
      totalEng += Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0);
    }
    const avgPostEngagement = recentPosts.length > 0 ? Math.round(totalEng / recentPosts.length) : 0;

    // Posts performing above recent average
    const aboveAveragePosts = recentPosts
      .filter((p) => Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0) > avgPostEngagement)
      .map((p) => ({
        id: p.id,
        snippet: p.content ? p.content.slice(0, 100) + '...' : '',
        engagement: Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0),
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        postUrl: p.postUrl,
      }));

    // Posts performing below average
    const belowAveragePosts = recentPosts
      .filter((p) => Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0) < avgPostEngagement)
      .map((p) => ({
        id: p.id,
        snippet: p.content ? p.content.slice(0, 100) + '...' : '',
        engagement: Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0),
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        postUrl: p.postUrl,
      }));

    // 2. YouTube Channels Investigation: Compare recent 14 days vs prior 14 days
    const now = new Date();
    const d14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const channels = await this.channelRepo.find();
    const channelDeclines: any[] = [];

    for (const c of channels) {
      const curAgg = await this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.channelId = :chId AND ya.date BETWEEN :sDate AND :eDate', {
          chId: c.id,
          sDate: d14Ago,
          eDate: todayStr,
        })
        .select('SUM(ya.views)', 'views')
        .getRawOne();

      const prevAgg = await this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.channelId = :chId AND ya.date BETWEEN :sDate AND :eDate', {
          chId: c.id,
          sDate: d28Ago,
          eDate: d14Ago,
        })
        .select('SUM(ya.views)', 'views')
        .getRawOne();

      const curV = Number(curAgg?.views || 0);
      const prevV = Number(prevAgg?.views || 0);

      if (prevV > 0 && curV < prevV) {
        const dropPct = Math.round(((prevV - curV) / prevV) * 1000) / 10;
        channelDeclines.push({
          channelId: c.id,
          title: c.title,
          currentViews: curV,
          previousViews: prevV,
          dropPercent: dropPct,
        });
      }
    }

    return {
      operation: 'investigation',
      platform: 'all',
      primaryMetric: 'engagement',
      records: [
        {
          averagePostEngagement: avgPostEngagement,
          aboveAverageCount: aboveAveragePosts.length,
          belowAverageCount: belowAveragePosts.length,
          aboveAveragePosts: aboveAveragePosts.slice(0, 5),
          belowAveragePosts: belowAveragePosts.slice(0, 5),
          decliningChannels: channelDeclines,
        },
      ],
      summaryMetrics: {
        avgPostEngagement,
        aboveAveragePosts,
        belowAveragePosts,
        channelDeclines,
      },
      dataQualityNotes: notes,
    };
  }

  /**
   * 8. Specific Channel or Account In-Depth Performance
   */
  async getSpecificEntityPerformance(
    interpretation: StructuredInterpretation,
    userContext?: UserContext,
  ): Promise<QueryExecutionResult> {
    const notes: string[] = [];
    const { platform, targetId, targetIdentifier } = interpretation;

    // Check YouTube first if platform is youtube, all, or target matches
    let ytChannel: YouTubeChannel | null = null;
    if (platform === 'youtube' || platform === 'all') {
      if (targetId) {
        ytChannel = await this.channelRepo.findOne({
          where: { id: targetId },
          relations: { videos: true },
        });
      }
      if (!ytChannel && targetIdentifier) {
        ytChannel = await this.channelRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.videos', 'videos')
          .where('c.title ILIKE :iden OR c.customUrl ILIKE :iden', { iden: `%${targetIdentifier}%` })
          .getOne();
      }
    }

    if (ytChannel) {
      this.enforceWorkspaceScope('channel', ytChannel.id, userContext);

      // Top 10 videos
      const topVideos = await this.videoRepo.find({
        where: { channelId: ytChannel.id },
        order: { views: 'DESC' },
        take: 10,
      });

      // Period aggregates
      const agg = await this.ytAnalyticsRepo
        .createQueryBuilder('ya')
        .where('ya.channelId = :chId', { chId: ytChannel.id })
        .select('SUM(ya.views)', 'views')
        .addSelect('SUM(ya.likes)', 'likes')
        .addSelect('SUM(ya.comments)', 'comments')
        .addSelect('SUM(ya.watchTimeMinutes)', 'watchTime')
        .addSelect('SUM(ya.subscribersGained)', 'subsGained')
        .getRawOne();

      // Daily analytics for chart
      const dailyPoints = await this.ytAnalyticsRepo.find({
        where: { channel: { id: ytChannel.id } },
        order: { date: 'ASC' },
        take: 30,
      });

      let chartData: ChartData | null = null;
      if (dailyPoints.length > 0) {
        chartData = {
          type: 'area',
          title: `${ytChannel.title} Daily Views Trajectory`,
          xKey: 'date',
          dataKeys: [
            { key: 'views', name: 'Views', color: '#6366f1' },
            { key: 'likes', name: 'Likes', color: '#10b981' },
          ],
          data: dailyPoints.map((p) => ({
            date: p.date,
            views: Number(p.views || 0),
            likes: Number(p.likes || 0),
          })),
        };
      }

      if (topVideos.length === 0) {
        notes.push(`No public uploads found yet for YouTube channel "${ytChannel.title}".`);
      }

      const formattedVideos = topVideos.map((v, i) => ({
        rank: i + 1,
        videoId: v.videoId,
        title: v.title,
        views: Number(v.views || 0),
        likes: Number(v.likes || 0),
        comments: Number(v.comments || 0),
        duration: v.duration || '00:00',
        publishedAt: v.publishedAt ? v.publishedAt.split('T')[0] : 'Unknown',
        videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      }));

      const summaryMetrics = {
        entityType: 'youtube_channel',
        id: ytChannel.id,
        title: ytChannel.title,
        customUrl: ytChannel.customUrl,
        channelId: ytChannel.channelId,
        subscribers: Number(ytChannel.subscribers || 0),
        totalViews: Number(ytChannel.totalViews || 0),
        totalVideos: Number(ytChannel.totalVideos || 0),
        periodViews: Number(agg?.views || 0),
        periodLikes: Number(agg?.likes || 0),
        periodComments: Number(agg?.comments || 0),
        periodWatchTime: Number(agg?.watchTime || 0),
        periodSubscribersGained: Number(agg?.subsGained || 0),
        videoCount: topVideos.length,
      };

      return {
        operation: 'entity_detail',
        platform: 'youtube',
        primaryMetric: interpretation.metric || 'views',
        records: formattedVideos,
        chartData,
        summaryMetrics,
        dataQualityNotes: notes,
      };
    }

    // Check LinkedIn Account
    let liAccount: Account | null = null;
    if (platform === 'linkedin' || platform === 'all') {
      if (targetId) {
        liAccount = await this.accountRepo.findOne({ where: { id: targetId } });
      }
      if (!liAccount && targetIdentifier) {
        liAccount = await this.accountRepo
          .createQueryBuilder('a')
          .where('a.username ILIKE :iden', { iden: `%${targetIdentifier}%` })
          .getOne();
      }
    }

    if (liAccount) {
      this.enforceWorkspaceScope('account', liAccount.id, userContext);

      const latestAnalytics = await this.analyticsRepo.findOne({
        where: { account: { id: liAccount.id } },
        order: { date: 'DESC', id: 'DESC' },
      });

      const posts = await this.postRepo.find({
        where: { accountId: liAccount.id },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      if (posts.length === 0) {
        notes.push(
          `No feed updates are currently stored in database for LinkedIn account "${liAccount.username}". Run a collection sync on the LinkedIn Monitoring dashboard to ingest recent posts.`,
        );
      }

      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      for (const p of posts) {
        totalLikes += Number(p.likes || 0);
        totalComments += Number(p.comments || 0);
        totalShares += Number(p.shares || 0);
      }

      const formattedPosts = posts.map((p, i) => {
        const likes = Number(p.likes || 0);
        const comments = Number(p.comments || 0);
        const shares = Number(p.shares || 0);
        return {
          rank: i + 1,
          id: p.id,
          contentSnippet: p.content ? p.content.slice(0, 120) + '...' : '',
          author: p.author || liAccount!.username,
          likes,
          comments,
          shares,
          totalEngagement: likes + comments + shares,
          publishedAt: p.createdAt ? p.createdAt.split('T')[0] : p.postDate || 'Recent',
          postUrl: p.postUrl || `https://www.linkedin.com/feed/update/${p.id}`,
        };
      });

      const summaryMetrics = {
        entityType: 'linkedin_account',
        id: liAccount.id,
        username: liAccount.username,
        profileUrl: liAccount.profileUrl,
        followers: Number(latestAnalytics?.followers || 0),
        views: Number(latestAnalytics?.views || 0),
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement: totalLikes + totalComments + totalShares,
      };

      return {
        operation: 'entity_detail',
        platform: 'linkedin',
        primaryMetric: interpretation.metric || 'followers',
        records: formattedPosts,
        summaryMetrics,
        dataQualityNotes: notes,
      };
    }

    notes.push(
      `Could not locate a connected channel or account matching "${targetIdentifier || targetId}". Displaying overall workspace summary instead.`,
    );
    return this.getWorkspaceSummary(interpretation, userContext);
  }
}
