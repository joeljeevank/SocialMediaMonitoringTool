import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, CreateDateColumn } from 'typeorm';
import { YouTubeChannel } from './youtube-channel.entity';

@Entity('youtube_analytics')
@Unique(['channel', 'date'])
export class YouTubeAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  watchTimeMinutes: number; // estimatedMinutesWatched from YouTube Analytics API

  @Column({ type: 'int', default: 0 })
  averageViewDurationSeconds: number; // averageViewDuration in seconds

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  comments: number;

  @Column({ type: 'int', default: 0 })
  shares: number;

  @Column({ type: 'int', default: 0 })
  subscribersGained: number;

  @Column({ type: 'int', default: 0 })
  subscribersLost: number;

  @ManyToOne(() => YouTubeChannel, (channel) => channel.analytics, { onDelete: 'CASCADE' })
  channel: YouTubeChannel;

  @CreateDateColumn()
  createdAt: Date;
}
