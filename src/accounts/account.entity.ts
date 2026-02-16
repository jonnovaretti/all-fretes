import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Track } from '../tracks/track.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ name: 'login_url', type: 'varchar', nullable: false })
  loginUrl!: string;

  @Column({ type: 'varchar', nullable: false })
  username!: string;

  // Demo-only: plain-text password storage is intentionally insecure.
  @Column({ type: 'varchar', nullable: false })
  password!: string;

  @OneToMany(() => Track, (track) => track.account)
  tracks!: Track[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
