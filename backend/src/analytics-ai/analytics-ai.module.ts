import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsAiController } from './analytics-ai.controller';
import { AnalyticsAiService } from './analytics-ai.service';
import { AnalyticsAiQueryEngineService } from './analytics-ai-query-engine.service';
import { Account } from '../account.entity';
import { Analytics } from '../analytics.entity';
import { Post } from '../post.entity';
import { User } from '../user.entity';
import { YouTubeChannel } from '../youtube/youtube-channel.entity';
import { YouTubeVideo } from '../youtube/youtube-video.entity';
import { YouTubeAnalytics } from '../youtube/youtube-analytics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Analytics,
      Post,
      User,
      YouTubeChannel,
      YouTubeVideo,
      YouTubeAnalytics,
    ]),
  ],
  controllers: [AnalyticsAiController],
  providers: [AnalyticsAiService, AnalyticsAiQueryEngineService],
  exports: [AnalyticsAiService, AnalyticsAiQueryEngineService],
})
export class AnalyticsAiModule {}

