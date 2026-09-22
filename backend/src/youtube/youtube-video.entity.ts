import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { YouTubeChannel } from './youtube-channel.entity';

@Entity('youtube_videos')
export class YouTubeVideo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  videoId: string; // YouTube Video ID (11 characters)

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column()
  publishedAt: string; // ISO 8601 timestamp

  @Column({ default: '00:00' })
  duration: string; // Formatted duration e.g. '04:15' or ISO 'PT4M15S'

  @Column({ type: 'bigint', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  comments: number;

  @Column({ nullable: true })
  channelId: number;

  @ManyToOne(() => YouTubeChannel, (channel) => channel.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: YouTubeChannel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
