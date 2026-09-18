import { Controller, Get, Post, Delete, Param, Query, Body, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { YoutubeService } from './youtube.service';

@Controller('api/youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('config')
  getConfig() {
    return this.youtubeService.getConfig();
  }

  @Post('config')
  @HttpCode(200)
  updateConfig(@Body() body: { apiKey?: string }) {
    return this.youtubeService.saveApiKey(body.apiKey || '');
  }

  @Post('channels/track')
  @HttpCode(200)
  trackChannel(@Body() body: { identifier: string; apiKey?: string }) {
    return this.youtubeService.trackChannel(body.identifier, body.apiKey);
  }

  @Get('auth/url')
  getAuthUrl() {
    return this.youtubeService.getAuthUrl();
  }

  @Get('auth/callback')
  async handleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    if (error) {
      let friendly = error;
      if (error === 'access_denied') {
        friendly = 'Google Error 403: access_denied. The app is in "Testing" mode. In Google Cloud Console -> OAuth consent screen, add your email under "Test users" or click "Publish App".';
      }
      return res.redirect(`http://localhost:3000/dashboard/youtube?status=error&message=${encodeURIComponent(friendly)}`);
    }

    try {
      const channel = await this.youtubeService.handleAuthCallback(code);
      return res.redirect(
        `http://localhost:3000/dashboard/youtube?status=connected&channelId=${channel.id}&title=${encodeURIComponent(channel.title)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `http://localhost:3000/dashboard/youtube?status=error&message=${encodeURIComponent(err.message || 'OAuth verification failed')}`,
      );
    }
  }

  @Get('channels')
  getChannels() {
    return this.youtubeService.getChannels();
  }

  @Get('channels/:id')
  getChannel(@Param('id') id: string) {
    return this.youtubeService.getChannel(Number(id));
  }

  @Delete('channels/:id')
  disconnectChannel(@Param('id') id: string) {
    return this.youtubeService.disconnectChannel(Number(id));
  }

  @Post('channels/:id/sync')
  @HttpCode(200)
  syncChannel(@Param('id') id: string) {
    return this.youtubeService.syncChannelData(Number(id));
  }

  @Post('sync-all')
  @HttpCode(200)
  syncAll() {
    return this.youtubeService.syncAllChannels();
  }

  @Get('overview')
  getOverview(@Query('channelId') channelId?: string, @Query('range') range?: string) {
    return this.youtubeService.getOverview(channelId, range);
  }

  @Get('analytics')
  getAnalytics(@Query('channelId') channelId?: string, @Query('range') range?: string) {
    return this.youtubeService.getAnalyticsTimeseries(channelId, range);
  }

  @Get('videos')
  getVideos(
    @Query('channelId') channelId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.youtubeService.getVideos({
      channelId,
      search,
      sort,
      order: order === 'ASC' ? 'ASC' : 'DESC',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }
}
