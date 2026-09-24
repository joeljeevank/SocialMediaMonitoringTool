import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Account } from './account.entity';

@Entity()
export class Post {
  @PrimaryColumn()
  id: string; // Post URN

  @Column('text')
  content: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  postDate: string;

  @Column({ nullable: true })
  postUrl: string;

  @Column()
  createdAt: string;

  @Column({ default: 0 })
  impressions: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  comments: number;

  @Column({ default: 'API' })
  dataSource: string;

  @Column({ nullable: true })
  unavailableMetrics: string;

  @Column({ nullable: true })
  accountId: number;

  @ManyToOne(() => Account, account => account.posts, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @ManyToOne(() => Organization, org => org.posts, { nullable: true })
  organization: Organization;
}

