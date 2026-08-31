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

import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: process.env.DB_PASSWORD || 'post123',
      database: 'postgres',
      entities: [Account, Analytics, Organization, Post, User],
      synchronize: true, // Auto create schema
    }),
    TypeOrmModule.forFeature([Account, Analytics, Organization, Post, User]),
  ],
  controllers: [AppController, LinkedinController, CollectorController],
  providers: [AppService, LinkedinService, CollectorService],
})
export class AppModule {}
