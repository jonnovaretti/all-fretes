import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shipment } from '../shipments/shipment.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'base_url', type: 'varchar', nullable: false })
  baseUrl: string;

  @Column({ type: 'varchar', nullable: false })
  username: string;

  // Demo-only: plain-text password storage is intentionally insecure.
  @Column({ type: 'varchar', nullable: false })
  password: string;

  @OneToMany(() => Shipment, (shipment) => shipment.account)
  shipments: Shipment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
