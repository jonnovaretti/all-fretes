import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3000),
  playwrightHeadless: (process.env.PLAYWRIGHT_HEADLESS ?? 'true') !== 'false'
}));
