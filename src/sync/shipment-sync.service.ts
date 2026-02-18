import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_SHIPMENTS_QUEUE_NAME } from '../common/constants';
import {
  GoFreteNavigatorService,
  ShipmentRow
} from '../playwright/gofrete-navigator.service';
import {
  ParsedShipmentRow,
  ShipmentsService,
  ParsedTrackingEvent
} from '../shipments/shipments.service';
import { parseBRDate, parseBRDateTime, parseBRL } from './helpers/parse.helper';

export const SYNC_QUEUE = 'SYNC_QUEUE';

interface SyncShipmentsJobPayload {
  accountId: string;
}

@Injectable()
export class ShipmentSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(ShipmentSyncService.name);
  private readonly queueName: string;
  private readonly worker: Worker<SyncShipmentsJobPayload>;

  constructor(
    @Inject(SYNC_QUEUE) private readonly queue: Queue<SyncShipmentsJobPayload>,
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly goFreteNavigatorService: GoFreteNavigatorService
  ) {
    this.queueName = this.configService.get<string>(
      'queue.syncQueueName',
      SYNC_SHIPMENTS_QUEUE_NAME
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
          maxRetriesPerRequest: null
        }
      }
    );

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `Job ${job.id} completed with result: ${JSON.stringify(result)}`
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });
  }

  async enqueue(accountId: string) {
    const job = await this.queue.add(
      'sync-shipments-job',
      { accountId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 50,
        removeOnFail: 50
      }
    );

    return { jobId: job.id };
  }

  async handleSync(payload: SyncShipmentsJobPayload) {
    this.logger.log(`Starting sync for account ${payload.accountId}`);

    const pageNumber = 1;
    const pageSize = 10;
    const parsedShipmentRow: ParsedShipmentRow[] = [];
    const account = await this.accountsService.findOneOrFail(payload.accountId);
    const shipmentList: ShipmentRow[] = [];

    const browser = await this.goFreteNavigatorService.createBrowser();

    const loggedPage = await this.goFreteNavigatorService.signInPage(browser, {
      loginUrl: account.loginUrl,
      username: account.username,
      password: account.password
    });

    let containsNoResultMessage =
      await this.goFreteNavigatorService.containsNoResultMessage(loggedPage);

    while (!containsNoResultMessage) {
      await this.goFreteNavigatorService.goToShipmentPage(
        loggedPage,
        'collected',
        {
          pageNumber,
          pageSize,
          orderBy: 'DESC',
          initialDate: ''
        }
      );

      const tableRows =
        await this.goFreteNavigatorService.readShipmentTable(loggedPage);

      const shipmentRows =
        await this.goFreteNavigatorService.extractShipmentDataFromTable(
          tableRows
        );

      shipmentList.push(...shipmentRows);

      await this.goFreteNavigatorService.goToNextPage(loggedPage);

      containsNoResultMessage =
        await this.goFreteNavigatorService.containsNoResultMessage(loggedPage);
    }

    for (const shipmentRow of shipmentList) {
      await this.goFreteNavigatorService.goToTrackingPage(
        loggedPage,
        shipmentRow.shipmentId
      );

      const trackingEvent =
        await this.goFreteNavigatorService.extractTrackingDataFromPage(
          loggedPage
        );

      shipmentRow.carrier = trackingEvent.carrier;
      shipmentRow.deliveryEstimateDate = trackingEvent.estimateDate;
      shipmentRow.trackingRows = trackingEvent.events;
    }

    shipmentList.forEach((shipmentRow) => {
      const parsedTracking: ParsedTrackingEvent[] = [];

      shipmentRow.trackingRows?.forEach((tracking) => {
        parsedTracking.push({
          notifiedAt: parseBRDateTime(tracking.date, tracking.time),
          status: tracking.status,
          statusDescription: tracking.description
        });
      });

      parsedShipmentRow.push({
        externalId: shipmentRow.shipmentId,
        status: shipmentRow.status,
        origin: shipmentRow.origin,
        destination: shipmentRow.destination,
        value: parseBRL(shipmentRow.value),
        openedAt: parseBRDate(shipmentRow.startedAt),
        scheduled: shipmentRow.deliveryEstimate,
        invoiceCode: shipmentRow.invoiceNumber,
        carrier: shipmentRow.carrier,
        estimatedDate: parseBRDate(shipmentRow.deliveryEstimateDate ?? ''),
        tracking: shipmentRow.trackingRows ? [...parsedTracking] : []
      });
    });

    const summary = await this.shipmentsService.upsertShipments(
      account.id,
      parsedShipmentRow
    );

    this.logger.log(`Sync finished for account ${account.id}`);

    return {
      accountId: account.id,
      totalRows: parsedShipmentRow.length,
      ...summary
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
