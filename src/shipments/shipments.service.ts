import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

interface UpdateTrackingPayload {
  carrier: string;
  estimatedDate: Date;
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

    await this.shipmentRepository.save(entities);

    return { inserted, updated };
  }

  async updateShipmentTracking(
    shipmentId: string,
    payload: UpdateTrackingPayload
  ) {
    const shipment = await this.shipmentRepository.findOneByOrFail({
      id: shipmentId
    });

    shipment.carrier = payload.carrier;
    shipment.deliveryEstimateDate = payload.estimatedDate;

    await this.shipmentRepository.save(shipment);

    await this.trackingRepository.delete({ shipmentId });

    if (!payload.tracking.length) {
      return;
    }

    const trackingRows = payload.tracking.map((trackingRow) =>
      this.trackingRepository.create({
        shipmentId,
        status: trackingRow.status,
        statusDescription: trackingRow.statusDescription ?? undefined,
        notifiedAt: trackingRow.notifiedAt
      })
    );

    await this.trackingRepository.save(trackingRows);
  }
}
