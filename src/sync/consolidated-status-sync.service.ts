import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_CONSOLIDATED_STATUS_QUEUE_NAME } from '../common/constants';
import {
  ConsolidatedShipmentStatus,
  Shipment,
} from '../shipments/shipment.entity';
import { ShipmentsService } from '../shipments/shipments.service';

export const SYNC_CONSOLIDATED_STATUS_QUEUE = 'SYNC_CONSOLIDATED_STATUS_QUEUE';

interface SyncConsolidatedStatusJobPayload {
  accountId: string;
  forceAllAccounts?: boolean;
}

@Injectable()
export class ConsolidatedStatusSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsolidatedStatusSyncService.name);
  private readonly queueName: string;
  private readonly worker: Worker<SyncConsolidatedStatusJobPayload>;

  constructor(
    @Inject(SYNC_CONSOLIDATED_STATUS_QUEUE)
    private readonly queue: Queue<SyncConsolidatedStatusJobPayload>,
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
  ) {
    this.queueName = this.configService.get<string>(
      'queue.syncConsolidatedStatusQueueName',
      SYNC_CONSOLIDATED_STATUS_QUEUE_NAME,
    );

    const redisConfig = this.configService.get<{
      host: string;
      port: number;
      username?: string;
      password?: string;
    }>('queue.redis');

    this.worker = new Worker(
      this.queueName,
      async (job) => this.handleSync(job.data),
      {
        concurrency: 2,
        connection: {
          host: redisConfig?.host,
          port: redisConfig?.port,
          username: redisConfig?.username,
          password: redisConfig?.password,
          maxRetriesPerRequest: null,
        },
      },
    );

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `Job ${job.id} completed with result: ${JSON.stringify(result)}`,
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });
  }

  async enqueue(accountId: string, forceAllAccounts: boolean) {
    const job = await this.queue.add(
      'sync-consolidated-status-job',
      { accountId, forceAllAccounts },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );

    return { jobId: job.id };
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

  async onModuleDestroy() {
    await this.worker.close();
  }
}
