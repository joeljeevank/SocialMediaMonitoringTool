import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { YouTubeVideo } from './youtube-video.entity';
import { YouTubeAnalytics } from './youtube-analytics.entity';

@Entity('youtube_channels')
export class YouTubeChannel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  channelId: string; // e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  customUrl: string; // e.g. @google

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  publishedAt: string; // Channel registration date

  @Column({ default: 'Connected' })
  status: string;

  @Column({ nullable: true })
  googleAccountEmail: string;

  @Column({ type: 'text', nullable: true })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'bigint', default: 0 })
  subscribers: number;

  @Column({ type: 'bigint', default: 0 })
  totalViews: string;

  @Column({ type: 'int', default: 0 })
  totalVideos: number;

  @Column({ nullable: true })
  uploadsPlaylistId: string;

  @Column({ nullable: true })
  lastSyncedAt: string;

  @Column({ nullable: true })
  lastAnalyticsSyncAt: string;

  @OneToMany(() => YouTubeVideo, (video) => video.channel, { cascade: true, onDelete: 'CASCADE' })
  videos: YouTubeVideo[];

  @OneToMany(() => YouTubeAnalytics, (analytics) => analytics.channel, { cascade: true, onDelete: 'CASCADE' })
  analytics: YouTubeAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
