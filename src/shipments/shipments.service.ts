import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FindShipmentsQueryDto,
  ShipmentOrderBy,
} from './dto/find-shipments-query.dto';
import { ConsolidatedShipmentStatus, Shipment } from './shipment.entity';
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
  scheduled: number;
}

interface UpdateTrackingPayload {
  carrier: string;
  estimatedDate: Date;
  tracking: ParsedTrackingEvent[];
}

type ShipmentWithCarrierData = Omit<Shipment, 'tracking'> & {
  carrierStatus: string | null;
  statusDescription: string | null;
  lastNotifiedAt: Date | null;
};

interface ShipmentIds {
  id: string;
  externalId: string;
  totalDaysEstimate: number;
  startedAt: Date | null;
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Tracking)
    private readonly trackingRepository: Repository<Tracking>,
  ) {}

  async getAllShipmentIds(accountId: string): Promise<ShipmentIds[]> {
    const shipments = await this.shipmentRepository.findBy({ accountId });

    return shipments.map((s) => {
      return {
        id: s.id,
        externalId: s.externalId,
        totalDaysEstimate: s.totalDaysEstimated,
        startedAt: s.startedAt,
      };
    });
  }

  async getShipmentsToSyncConsolidatedStatus(
    accountId: string,
    forceAllAccounts?: boolean,
  ): Promise<Shipment[]> {
    const query = this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.tracking', 'tracking')
      .where('shipment.accountId = :accountId', { accountId });

    if (!forceAllAccounts) {
      query.andWhere(
        '(shipment.consolidatedStatus IS NULL OR shipment.consolidatedStatus NOT IN (:...statuses))',
        {
          statuses: [
            ConsolidatedShipmentStatus.FINISHED,
            ConsolidatedShipmentStatus.RETURNING,
          ],
        },
      );
    }

    return query.getMany();
  }

  async findByAccountId(
    accountId: string,
    query?: FindShipmentsQueryDto,
  ): Promise<ShipmentWithCarrierData[]> {
    const shouldPaginate = Boolean(query);
    const page = query?.page ?? 1;
    const totalItems = query?.totalItems ?? 10;
    const orderBy = query?.orderBy ?? ShipmentOrderBy.DESC;
    const offset = (page - 1) * totalItems;

    const latestCarrierStatusSelect = `
      (
        SELECT tracking.status
        FROM tracking tracking
        WHERE tracking.shipment_fk_id = shipment.id
        ORDER BY tracking.notified_at DESC
        LIMIT 1
      )
    `;

    const latestStatusDescriptionSelect = `
      (
        SELECT tracking.status_description
        FROM tracking tracking
        WHERE tracking.shipment_fk_id = shipment.id
        ORDER BY tracking.notified_at DESC
        LIMIT 1
      )
    `;

    const latestNotifiedAtSelect = `
      (
        SELECT tracking.notified_at
        FROM tracking tracking
        WHERE tracking.shipment_fk_id = shipment.id
        ORDER BY tracking.notified_at DESC
        LIMIT 1
      )
    `;

    const queryBuilder = this.shipmentRepository
      .createQueryBuilder('shipment')
      .where('shipment.accountId = :accountId', { accountId })
      .addSelect(latestCarrierStatusSelect, 'carrierStatus')
      .addSelect(latestStatusDescriptionSelect, 'statusDescription')
      .addSelect(latestNotifiedAtSelect, 'lastNotifiedAt')
      .orderBy('shipment.createdAt', orderBy);

    if (shouldPaginate) {
      queryBuilder.skip(offset).take(totalItems);
    }

    if (query?.externalId) {
      queryBuilder.andWhere('shipment.externalId ILIKE :externalId', {
        externalId: `%${query.externalId}%`,
      });
    }

    if (query?.invoiceCode) {
      queryBuilder.andWhere('shipment.invoiceCode ILIKE :invoiceCode', {
        invoiceCode: `%${query.invoiceCode}%`,
      });
    }

    if (query?.status) {
      queryBuilder.andWhere('shipment.status ILIKE :status', {
        status: `%${query.status}%`,
      });
    }

    if (query?.carrierStatus) {
      queryBuilder.andWhere(
        `${latestCarrierStatusSelect} ILIKE :carrierStatus`,
        {
          carrierStatus: `%${query.carrierStatus}%`,
        },
      );
    }

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    return entities.map((shipment, index) => ({
      ...shipment,
      carrierStatus: raw[index]?.carrierStatus ?? null,
      statusDescription: raw[index]?.statusDescription ?? null,
      lastNotifiedAt: raw[index]?.lastNotifiedAt
        ? new Date(raw[index].lastNotifiedAt)
        : null,
    }));
  }

  async upsertShipments(
    accountId: string,
    parsedShipments: ParsedShipmentRow[],
  ) {
    if (!parsedShipments.length) {
      return { inserted: 0, updated: 0 };
    }

    const existing = await this.shipmentRepository.find({
      where: { accountId },
    });
    const map = new Map(existing.map((t) => [t.externalId, t]));

    let inserted = 0;
    let updated = 0;

    const entities = parsedShipments.map((parsedShipment) => {
      const found = map.get(parsedShipment.externalId);
      if (found) {
        if (found.status !== parsedShipment.status) {
          updated += 1;
          found.status = parsedShipment.status;
        }
        return found;
      }

      inserted += 1;

      return this.shipmentRepository.create({
        accountId,
        externalId: parsedShipment.externalId,
        status: parsedShipment.status,
        startedAt: parsedShipment.openedAt,
        totalDaysEstimated: parsedShipment.scheduled,
        invoiceCode: parsedShipment.invoiceCode,
        destination: parsedShipment.destination,
        origin: parsedShipment.origin,
        value: parsedShipment.value,
      });
    });

    if (inserted > 0 || updated > 0) {
      await this.shipmentRepository.save(entities);
    }

    return { inserted, updated };
  }

  async updateShipmentTracking(
    shipmentId: string,
    payload: UpdateTrackingPayload,
  ) {
    const shipment = await this.shipmentRepository.findOneByOrFail({
      id: shipmentId,
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
        notifiedAt: trackingRow.notifiedAt,
      }),
    );

    await this.trackingRepository.save(trackingRows);
  }

  async updateConsolidatedStatus(
    shipmentId: string,
    consolidatedStatus: ConsolidatedShipmentStatus | null,
  ) {
    await this.shipmentRepository.update(
      { id: shipmentId },
      { consolidatedStatus },
    );
  }
}
