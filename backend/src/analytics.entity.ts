import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity()
export class Analytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string; // YYYY-MM-DD format for simplicity

  @Column()
  likes: number;

  @Column()
  comments: number;

  @Column()
  shares: number;

  @Column()
  views: number;

  @Column()
  followers: number;

  @Column({ default: 0 })
  recentPosts: number;

  @Column({ default: 'API' })
  dataSource: string;

  @Column({ nullable: true })
  unavailableMetrics: string;

  @Column({ nullable: true })
  lastCollectionTime: string;

  @ManyToOne(() => Account, account => account.analytics)
  account: Account;
}
