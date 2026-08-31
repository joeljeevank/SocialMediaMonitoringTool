import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  companyRole: string;

  @Column()
  role: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Stored as plain text or simple hash for demo purposes
}
