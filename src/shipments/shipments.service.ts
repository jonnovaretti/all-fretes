import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipment } from './shipment.entity';
import { Tracking } from './tracking.entity';

export type ParsedTrackingEvent = {
  notifiedAt: Date;
  status: string;
  statusDescription: string | null;
};

export interface ParsedShipmentRow {
  externalId: string;
  status: string;
  invoiceCode: string;
  origin: string;
  destination: string;
  value: number;
  openedAt: Date;
  scheduled: string;
  carrier?: string;
  estimatedDate?: Date;
  tracking: ParsedTrackingEvent[];
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Tracking)
    private readonly trackingRepository: Repository<Tracking>
  ) {}

  findByAccountId(accountId: string) {
    return this.shipmentRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' }
    });
  }

  async upsertShipments(accountId: string, rows: ParsedShipmentRow[]) {
    if (!rows.length) {
      return { inserted: 0, updated: 0 };
    }

    const existing = await this.shipmentRepository.find({
      where: { accountId }
    });
    const map = new Map(existing.map((t) => [t.externalId, t]));

    let inserted = 0;
    let updated = 0;

    const entities = rows.map((row) => {
      const found = map.get(row.externalId);
      if (found) {
        updated += 1;
        found.status = row.status;
        found.startedAt = row.openedAt;
        found.deliveryEstimate = row.scheduled;
        found.invoiceCode = row.invoiceCode;
        found.destination = row.destination;
        found.origin = row.origin;
        found.value = row.value;
        if (row.carrier !== undefined) {
          found.carrier = row.carrier;
        }
        if (row.estimatedDate !== undefined) {
          found.deliveryEstimateDate = row.estimatedDate;
        }

        return found;
      }

      inserted += 1;

      return this.shipmentRepository.create({
        accountId,
        externalId: row.externalId,
        status: row.status,
        startedAt: row.openedAt,
        deliveryEstimate: row.scheduled,
        invoiceCode: row.invoiceCode,
        destination: row.destination,
        origin: row.origin,
        value: row.value,
        carrier: row.carrier,
        deliveryEstimateDate: row.estimatedDate
      });
    });

    const savedShipments = await this.shipmentRepository.save(entities);

    const shipmentIds = savedShipments.map((shipment) => shipment.id);
    if (shipmentIds.length) {
      await this.trackingRepository.delete({ shipmentId: In(shipmentIds) });

      const rowsByExternalId = new Map(rows.map((row) => [row.externalId, row]));
      const trackingEntities = savedShipments.flatMap((shipment) => {
        const row = rowsByExternalId.get(shipment.externalId);
        if (!row?.tracking.length) {
          return [];
        }

        return row.tracking.map((trackingEvent) =>
          this.trackingRepository.create({
            shipmentId: shipment.id,
            status: trackingEvent.status,
            statusDescription: trackingEvent.statusDescription ?? undefined,
            notifiedAt: trackingEvent.notifiedAt
          })
        );
      });

      if (trackingEntities.length) {
        await this.trackingRepository.save(trackingEntities);
      }
    }

    return { inserted, updated };
  }
}
