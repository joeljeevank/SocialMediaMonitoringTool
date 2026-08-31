import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Account } from './account.entity';
import { Post } from './post.entity';

@Entity()
export class Organization {
  @PrimaryColumn()
  id: string; // The URN or numeric ID

  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  website: string;

  @ManyToOne(() => Account, account => account.organizations)
  admin: Account;

  @OneToMany(() => Post, post => post.organization)
  posts: Post[];
}
