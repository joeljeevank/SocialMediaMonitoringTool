
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

import { AnalyticsAiModule } from './analytics-ai/analytics-ai.module';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const entities = [
  Account,
  Analytics,
  Organization,
  Post,
  User,
  YouTubeChannel,
  YouTubeVideo,
  YouTubeAnalytics,
];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',

      // Neon or other PostgreSQL connection
      url: process.env.DATABASE_URL,

      // Local PostgreSQL fallback
      host: process.env.DATABASE_URL
        ? undefined
        : process.env.DB_HOST || 'localhost',

      port: process.env.DATABASE_URL
        ? undefined
        : Number(process.env.DB_PORT || 5432),

      username: process.env.DATABASE_URL
        ? undefined
        : process.env.DB_USER || process.env.DB_USERNAME || 'postgres',

      password: process.env.DATABASE_URL
        ? undefined
        : process.env.DB_PASSWORD || 'sqlroot',

      database: process.env.DATABASE_URL
        ? undefined
        : process.env.DB_NAME || 'postgres',

      ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,

      entities,

      // Development: true only when explicitly enabled
      // Production: false
      synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',

      logging: process.env.NODE_ENV !== 'production',

      extra: {
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      },
    }),

    TypeOrmModule.forFeature(entities),

    AnalyticsAiModule,
  ],

  controllers: [
    AppController,
    LinkedinController,
    CollectorController,
    YoutubeController,
  ],

  providers: [
    AppService,
    LinkedinService,
    CollectorService,
    YoutubeService,
  ],
})
export class AppModule { }
