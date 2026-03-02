import {
  SYNC_CONSOLIDATED_STATUS_QUEUE_NAME,
  SYNC_SHIPMENTS_QUEUE_NAME,
  SYNC_TRACKING_QUEUE_NAME,
} from '../common/constants';
import { registerAs } from '@nestjs/config';

function parseRedisUrl() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
  };
}

export const queueConfig = registerAs('queue', () => {
  const parsedRedis = parseRedisUrl();

  return {
    redis: {
      host: parsedRedis?.host ?? process.env.REDIS_HOST ?? 'localhost',
      port: parsedRedis?.port ?? Number(process.env.REDIS_PORT ?? 6379),
      username: parsedRedis?.username,
      password: parsedRedis?.password,
    },
    syncQueueName: SYNC_SHIPMENTS_QUEUE_NAME,
    syncTrackingQueueName: SYNC_TRACKING_QUEUE_NAME,
    syncConsolidatedStatusQueueName: SYNC_CONSOLIDATED_STATUS_QUEUE_NAME,
  };
});
