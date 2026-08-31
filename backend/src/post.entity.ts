import { Entity, PrimaryColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity()
export class Post {
  @PrimaryColumn()
  id: string; // Post URN

  @Column('text')
  content: string;

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

  @ManyToOne(() => Organization, org => org.posts)
  organization: Organization;
}
