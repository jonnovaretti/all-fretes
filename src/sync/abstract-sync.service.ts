import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { SyncJobResponseDto } from './dto/sync-job-response.dto';
import { BaseSyncJobPayload } from './interfaces/base-sync-job-payload.interface';

type SyncServiceOptions = {
  queueConfigKey: string;
  defaultQueueName: string;
  jobName: string;
  loggerContext: string;
  concurrency?: number;
};

export abstract class AbstractSyncService<
  TPayload extends BaseSyncJobPayload,
> implements OnModuleDestroy {
  protected readonly logger: Logger;
  private readonly worker: Worker<TPayload>;
  private readonly jobName: string;

  protected constructor(
    protected readonly queue: Queue<any, any, string>,
    configService: ConfigService,
    options: SyncServiceOptions,
  ) {
    this.logger = new Logger(options.loggerContext);
    this.jobName = options.jobName;

    const queueName = configService.get<string>(
      options.queueConfigKey,
      options.defaultQueueName,
    );

    const redisConfig = configService.get<{
      host: string;
      port: number;
      username?: string;
      password?: string;
    }>('queue.redis');

    this.worker = new Worker(
      queueName,
      async (job) => this.handleSync(job.data),
      {
        concurrency: options.concurrency ?? 2,
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

  async enqueue(payload: TPayload): Promise<SyncJobResponseDto> {
    const job = await this.queue.add(this.jobName, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    });

    return { jobId: job.id };
  }

  abstract handleSync(payload: TPayload): Promise<unknown>;

  async onModuleDestroy() {
    await this.worker.close();
  }
}
