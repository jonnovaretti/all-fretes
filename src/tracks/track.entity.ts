import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm';
import { Account } from '../accounts/account.entity';

@Entity('tracks')
@Unique('UQ_tracks_account_external', ['accountId', 'externalId'])
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: false })
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.tracks, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ name: 'external_id', type: 'varchar', nullable: false })
  externalId!: string;

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'varchar', nullable: false })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
