import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_SHIPMENTS_QUEUE_NAME } from '../common/constants';
import { GoFreteNavigatorService } from '../playwright/gofrete-navigator.service';
import {
  ParsedShipmentRow,
  ShipmentsService,
} from '../shipments/shipments.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AbstractSyncService } from './abstract-sync.service';
import { BaseSyncJobPayload } from './interfaces/base-sync-job-payload.interface';

export const SYNC_QUEUE = 'SYNC_QUEUE';

export interface Quotation {
  id: number;
  status: number;
  statusText: string;
  date: string; // The raw string: "/Date(1771692164163)/"
  total: number;
  deadline: number;
  nfe: string;
  originCity: string;
  destinationCity: string;
  isPaid: boolean;
  isFinished: boolean;
  isFinishedReal: boolean;
  isChargeback: boolean;
  isCollected: boolean;
  isStartTransport: boolean;
}

// The version of the object we actually want to use in our UI/Logic
export interface ParsedQuotation extends Omit<Quotation, 'date'> {
  date: Date;
}

export interface ApiResponse {
  success: boolean;
  data: {
    total: number;
    quotations: Quotation[];
  };
}

@Injectable()
export class ShipmentSyncService extends AbstractSyncService<BaseSyncJobPayload> {
  constructor(
    @Inject(SYNC_QUEUE) queue: Queue<BaseSyncJobPayload>,
    configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly goFreteNavigatorService: GoFreteNavigatorService,
    private readonly httpService: HttpService,
  ) {
    super(queue, configService, {
      queueConfigKey: 'queue.syncQueueName',
      defaultQueueName: SYNC_SHIPMENTS_QUEUE_NAME,
      jobName: 'sync-shipments-job',
      loggerContext: ShipmentSyncService.name,
    });
  }

  async handleSync(payload: BaseSyncJobPayload) {
    this.logger.log(`Starting sync for account ${payload.accountId}`);

    const parsedShipmentRow: ParsedShipmentRow[] = [];
    const account = await this.accountsService.findOneOrFail(payload.accountId);
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

      const cookies = await loggedPage.context().cookies();

      const cookiesConcat = cookies
        .flatMap((c) => {
          if (
            c.name.toLowerCase().includes('aspnet') ||
            c.name.toLowerCase().includes('asp.net') ||
            c.name.toLowerCase().includes('gofretes')
          ) {
            return `${c.name}=${c.value};`;
          }
        })
        .join();

      const fetchShipmentsByStatus = async (
        status: string,
      ): Promise<ParsedQuotation[]> => {
        const encodedParams = new URLSearchParams();
        encodedParams.set('Page', '1');
        encodedParams.set('PageSize', '1000');
        encodedParams.set('OrderBy', 'DESC');
        encodedParams.set('Situation', status);

        const parsedShipments = await firstValueFrom(
          this.httpService
            .post<ApiResponse>(
              `${account.baseUrl}/Quotation/Quotations`,
              encodedParams,
              {
                headers: {
                  'content-type':
                    'application/x-www-form-urlencoded; charset=UTF-8',
                  cookie: cookiesConcat,
                },
              },
            )
            .pipe(
              map((response: AxiosResponse<ApiResponse>) => {
                if (!response.data.success) {
                  throw new Error('API reported failure');
                }

                // Map the raw DTOs to our Parsed Interface
                return response.data.data.quotations.map((q) =>
                  this.parseQuotation(q),
                );
              }),
              catchError((err) => {
                this.logger.error('Failed to fetch quotations', err.stack);
                throw err;
              }),
            ),
        );

        return parsedShipments;
      };

      const collectedShipment = await fetchShipmentsByStatus('collected');
      const finishedShipment = await fetchShipmentsByStatus('finished');

      this.logger.log(
        'par',
        collectedShipment.length,
        'fin',
        finishedShipment.length,
      );

      [...collectedShipment, ...finishedShipment].forEach((shipement) => {
        parsedShipmentRow.push({
          externalId: shipement.id.toString(),
          status: shipement.isFinished ? 'ENTREGUE' : 'TRANSPORTE INICIADO',
          origin: shipement.originCity,
          destination: shipement.destinationCity,
          value: shipement.total,
          openedAt: shipement.date,
          scheduled: shipement.deadline,
          invoiceCode: shipement.nfe,
        });
      });

      const summary = await this.shipmentsService.upsertShipments(
        account.id,
        parsedShipmentRow,
      );

      this.logger.log(`Sync finished for account ${account.id}`);

      return {
        accountId: account.id,
        totalRows: parsedShipmentRow.length,
        ...summary,
      };
    } finally {
      await browser.close();
    }
  }

  private parseQuotation(q: Quotation): ParsedQuotation {
    const match = q.date.match(/\/Date\((\d+)\)\//);
    const timestamp = match ? parseInt(match[1], 10) : 0;

    return {
      ...q,
      date: new Date(timestamp),
    };
  }
}
