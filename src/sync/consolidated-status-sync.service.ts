import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_CONSOLIDATED_STATUS_QUEUE_NAME } from '../common/constants';
import {
  ConsolidatedShipmentStatus,
  Shipment,
} from '../shipments/shipment.entity';
import { ShipmentsService } from '../shipments/shipments.service';
import { AbstractSyncService } from './abstract-sync.service';
import { BaseSyncJobPayload } from './interfaces/base-sync-job-payload.interface';

export const SYNC_CONSOLIDATED_STATUS_QUEUE = 'SYNC_CONSOLIDATED_STATUS_QUEUE';

interface SyncConsolidatedStatusJobPayload extends BaseSyncJobPayload {
  forceAllAccounts?: boolean;
}

@Injectable()
export class ConsolidatedStatusSyncService extends AbstractSyncService<SyncConsolidatedStatusJobPayload> {
  constructor(
    @Inject(SYNC_CONSOLIDATED_STATUS_QUEUE)
    queue: Queue<SyncConsolidatedStatusJobPayload>,
    configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
  ) {
    super(queue, configService, {
      queueConfigKey: 'queue.syncConsolidatedStatusQueueName',
      defaultQueueName: SYNC_CONSOLIDATED_STATUS_QUEUE_NAME,
      jobName: 'sync-consolidated-status-job',
      loggerContext: ConsolidatedStatusSyncService.name,
    });
  }

  async handleSync(payload: SyncConsolidatedStatusJobPayload) {
    this.logger.log(
      `Starting consolidated status sync for account ${payload.accountId}`,
    );

    const account = await this.accountsService.findOneOrFail(payload.accountId);
    const shipments =
      await this.shipmentsService.getShipmentsToSyncConsolidatedStatus(
        account.id,
        payload.forceAllAccounts,
      );

    let updated = 0;

    for (const shipment of shipments) {
      const consolidatedStatus = this.resolveConsolidatedStatus(shipment);

      if (shipment.consolidatedStatus !== consolidatedStatus) {
        await this.shipmentsService.updateConsolidatedStatus(
          shipment.id,
          consolidatedStatus,
        );
        updated += 1;
      }
    }

    this.logger.log(
      `Consolidated status sync finished for account ${account.id}`,
    );

    return {
      accountId: account.id,
      totalShipments: shipments.length,
      updated,
    };
  }

  private resolveConsolidatedStatus(
    shipment: Shipment,
  ): ConsolidatedShipmentStatus {
    const shipmentStatus = shipment.status.toLowerCase();

    const trackingStatuses = (shipment.tracking ?? [])
      .map((tracking) => tracking.status)
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    const trackingValues = (shipment.tracking ?? [])
      .flatMap((tracking) => [
        tracking.status,
        tracking.statusDescription ?? '',
      ])
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    if (
      trackingValues.some((value) =>
        /\b(?:return\w*|devol\w*|ressal\w*)\b/i.test(value),
      ) ||
      trackingStatuses.some((value) =>
        /\b(?:return\w*|devol\w*|ressal\w*)\b/i.test(value),
      )
    ) {
      return ConsolidatedShipmentStatus.RETURNING;
    }

    if (shipmentStatus === 'entregue') {
      if (
        trackingStatuses.some((value) =>
          /\bentregue\b|\bentrega\b|\bfinalizada\b/i.test(value),
        )
      ) {
        return ConsolidatedShipmentStatus.FINISHED;
      }
    }

    if (
      shipmentStatus === 'transporte iniciado' &&
      shipment.deliveryEstimateDate &&
      this.isBeforeToday(shipment.deliveryEstimateDate)
    ) {
      return ConsolidatedShipmentStatus.DELAYED;
    }

    return ConsolidatedShipmentStatus.IN_TRANSIT;
  }

  private isBeforeToday(value: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return value.getTime() < today.getTime();
  }
}
