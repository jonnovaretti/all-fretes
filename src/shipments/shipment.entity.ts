import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Tracking } from './tracking.entity';

@Entity('shipments')
@Unique('UQ_shipments_account_external', ['accountId', 'externalId'])
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: false })
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.shipments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToMany(() => Tracking, (tracking) => tracking.shipment)
  tracking!: Tracking[];

  @Column({ name: 'external_id', type: 'varchar', nullable: false })
  externalId!: string;

  @Column({ type: 'varchar', nullable: false })
  status!: string;

  @Column({ name: 'invoice_code', type: 'varchar', nullable: true })
  invoiceCode!: string;

  @Column({ type: 'varchar', nullable: false })
  origin!: string;

  @Column({ type: 'varchar', nullable: false })
  destination!: string;

  @Column({ type: 'varchar', nullable: false })
  value!: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date;

  @Column({ name: 'delivery_estimate', type: 'varchar', nullable: false })
  deliveryEstimate!: string;

  @Column({ type: 'varchar', nullable: true })
  carrier!: string;

  @Column({ name: 'delivery_estimate_date', type: 'timestamp', nullable: true })
  deliveryEstimateDate!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
