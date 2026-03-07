import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_TRACKING_QUEUE_NAME } from '../common/constants';
import { GoFreteNavigatorService } from '../playwright/gofrete-navigator.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { parseBRDate, parseBRDateTime } from './helpers/parse.helper';
import { ConsolidatedShipmentStatus } from 'src/shipments/shipment.entity';
import { AbstractSyncService } from './abstract-sync.service';
import { BaseSyncJobPayload } from './interfaces/base-sync-job-payload.interface';

export const SYNC_TRACKING_QUEUE = 'SYNC_TRACKING_QUEUE';

@Injectable()
export class TrackingSyncService extends AbstractSyncService<BaseSyncJobPayload> {
  constructor(
    @Inject(SYNC_TRACKING_QUEUE)
    queue: Queue<BaseSyncJobPayload>,
    configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly goFreteNavigatorService: GoFreteNavigatorService,
  ) {
    super(queue, configService, {
      queueConfigKey: 'queue.syncTrackingQueueName',
      defaultQueueName: SYNC_TRACKING_QUEUE_NAME,
      jobName: 'sync-tracking-job',
      loggerContext: TrackingSyncService.name,
    });
  }

  async handleSync(payload: BaseSyncJobPayload) {
    this.logger.log(`Starting tracking sync for account ${payload.accountId}`);

    const account = await this.accountsService.findOneOrFail(payload.accountId);
    const shipmentsIds = await this.shipmentsService.getAllShipmentIds(
      account.id,
    );

    const browser = await this.goFreteNavigatorService.createBrowser();

    try {
      const loggedPage = await this.goFreteNavigatorService.signInPage(
        browser,
        {
          baseUrl: account.baseUrl,
          username: account.username,
          password: account.password,
        },
      );

      let synced = 0;

      for (const shipmentIds of shipmentsIds) {
        if (
          shipmentIds.consolidateStatus ===
            ConsolidatedShipmentStatus.FINISHED ||
          shipmentIds.consolidateStatus === ConsolidatedShipmentStatus.RETURNING
        ) {
          continue;
        }

        await this.goFreteNavigatorService.goToTrackingPage(
          loggedPage,
          shipmentIds.externalId,
        );

        const trackingEvent =
          await this.goFreteNavigatorService.extractTrackingDataFromPage(
            loggedPage,
          );

        const parsedTrackings = trackingEvent.events.map((tracking) => ({
          notifiedAt: parseBRDateTime(tracking.date, tracking.time),
          status: tracking.status,
          statusDescription: tracking.description,
        }));

        this.logger.log(`Upsert tracking - ${shipmentIds.externalId}`);

        let deliveryEstimatedDate = parseBRDate(trackingEvent.estimateDate);

        // date convertion got error
        if (deliveryEstimatedDate.getFullYear() === 1900) {
          const baseEstimatedDate = shipmentIds.startedAt
            ? new Date(shipmentIds.startedAt)
            : parsedTrackings[0]?.notifiedAt
              ? new Date(parsedTrackings[0].notifiedAt)
              : new Date();

          baseEstimatedDate.setDate(
            baseEstimatedDate.getDate() + shipmentIds.totalDaysEstimate,
          );

          deliveryEstimatedDate = baseEstimatedDate;
        }

        await this.shipmentsService.updateShipmentTracking(shipmentIds.id, {
          carrier: trackingEvent.carrier,
          estimatedDate: deliveryEstimatedDate,
          tracking: parsedTrackings,
        });

        synced += 1;
      }

      this.logger.log(`Tracking sync finished for account ${account.id}`);

      return {
        accountId: account.id,
        totalShipments: shipmentsIds.length,
        synced,
      };
    } finally {
      await browser.close();
    }
  }
}
