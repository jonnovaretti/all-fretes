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
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  invoiceCode!: string;

  @Column({ type: 'varchar', nullable: false })
  origin!: string;

  @Column({ type: 'varchar', nullable: false })
  destination!: string;

  @Column({ type: 'varchar', nullable: false })
  value!: number;

  @Column({ type: 'varchar', nullable: false })
  openedAt!: Date;

  @Column({ type: 'varchar', nullable: false })
  scheduled!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
