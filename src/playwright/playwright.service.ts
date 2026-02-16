import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright';
import { ParsedTrackRow } from '../tracks/tracks.service';

@Injectable()
export class PlaywrightService {
  private readonly logger = new Logger(PlaywrightService.name);

  constructor(private readonly configService: ConfigService) {}

  async loginAndReadTracks(
    loginUrl: string,
    username: string,
    password: string
  ) {
    const headless = this.configService.get<boolean>(
      'app.playwrightHeadless',
      true
    );
    const browser = await chromium.launch({ headless });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      this.logger.log(`Navigating to login URL: ${loginUrl}`);
      await page.goto(loginUrl, { waitUntil: 'networkidle' });

      await page
        .locator('input[name$="UserName"], input[id$="UserName"]')
        .first()
        .fill(username);
      await page
        .locator('input[name$="Password"], input[id$="Password"]')
        .first()
        .fill(password);

      const submit = page
        .locator(
          'button[type="submit"], input[type="submit"], [id$="LoginButton"], [name$="LoginButton"]'
        )
        .first();

      await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 7000 }),
        submit.click()
      ]);

      await page.waitForLoadState('networkidle');

      const baseUrl = new URL(loginUrl).origin;
      const tracksUrl = new URL('/mock/tracks', baseUrl).toString();
      if (!page.url().includes('/mock/tracks')) {
        await page.goto(tracksUrl, { waitUntil: 'networkidle' });
      }

      const rows = await page.$$eval(
        '#ctl00_MainContent_TracksGrid tbody tr',
        (nodes) =>
          nodes
            .map((node) => {
              const cells = Array.from(node.querySelectorAll('td')).map(
                (cell) => cell.textContent?.trim() ?? ''
              );
              if (cells.length < 3) {
                return null;
              }

              return {
                externalId: cells[0],
                title: cells[1],
                status: cells[2]
              };
            })
            .filter((row): row is ParsedTrackRow => !!row)
      );

      return rows;
    } finally {
      await browser.close();
    }
  }
}
