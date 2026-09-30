import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LinkedinController } from './linkedin.controller';
import { LinkedinService } from './linkedin.service';
import { Account } from './account.entity';
import { Analytics } from './analytics.entity';
import { Organization } from './organization.entity';
import { Post } from './post.entity';
import { User } from './user.entity';
import { CollectorController } from './collector.controller';
import { CollectorService } from './collector.service';
import { YouTubeChannel } from './youtube/youtube-channel.entity';
import { YouTubeVideo } from './youtube/youtube-video.entity';
import { YouTubeAnalytics } from './youtube/youtube-analytics.entity';
import { YoutubeController } from './youtube/youtube.controller';
import { YoutubeService } from './youtube/youtube.service';

import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
            entities: [Account, Analytics, Organization, Post, User, YouTubeChannel, YouTubeVideo, YouTubeAnalytics],
            synchronize: true,
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
            username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'sqlroot',
            database: process.env.DB_NAME || 'postgres',
            entities: [Account, Analytics, Organization, Post, User, YouTubeChannel, YouTubeVideo, YouTubeAnalytics],
            synchronize: true,
          },
    ),
    TypeOrmModule.forFeature([Account, Analytics, Organization, Post, User, YouTubeChannel, YouTubeVideo, YouTubeAnalytics]),
  ],
  controllers: [AppController, LinkedinController, CollectorController, YoutubeController],
  providers: [AppService, LinkedinService, CollectorService, YoutubeService],
})
export class AppModule {}
