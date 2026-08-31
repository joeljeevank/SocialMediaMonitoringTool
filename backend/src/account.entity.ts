import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Analytics } from './analytics.entity';
import { Organization } from './organization.entity';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  platform: string;

  @Column()
  username: string;

  @Column()
  profileUrl: string;

  @Column({ default: 'Connected' })
  status: string;

  @Column({ nullable: true })
  accessToken: string; // Storing access token securely

  @OneToMany(() => Analytics, analytics => analytics.account)
  analytics: Analytics[];

  @OneToMany(() => Organization, org => org.admin)
  organizations: Organization[];
}
