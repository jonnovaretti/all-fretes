import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Shipment } from './shipment.entity';

@Entity('tracking')
export class Tracking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shipment_fk_id', type: 'uuid', nullable: false })
  shipmentId!: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.tracking, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'shipment_id' })
  shipment!: Shipment;

  @Column({ type: 'varchar', nullable: false })
  status!: string;

  @Column({ name: 'status_description', type: 'varchar', nullable: true })
  statusDescription?: string;

  @Column({ name: 'notified_at', type: 'timestamp', nullable: false })
  notifiedAt!: Date;
}
