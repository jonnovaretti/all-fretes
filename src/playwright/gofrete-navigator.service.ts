import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, chromium, Locator, Page } from 'playwright';

interface SignInPage {
  loginUrl: string;
  username: string;
  password: string;
}

interface Pagination {
  pageNumber: number;
  pageSize: number;
  orderBy: string;
  initialDate: string;
}

export interface ShipmentRow {
  shipmentId: string;
  status: string;
  invoiceNumber: string;
  origin: string;
  destination: string;
  startedAt: string;
  deliveryEstimate: string;
  value: string;
  deliveryEstimateDate?: string;
  carrier?: string;
  trackingRows?: TrackingEvent[];
}

type TrackingEvent = {
  date: string; // "17/02/2026"
  time: string; // "10:41"
  status: string; // "MERCADORIA ENTREGUE (01)"
  description: string | null;
};

type TrackingData = {
  carrier: string;
  estimateDate: string; // "20/02/2026"
  events: TrackingEvent[];
};

@Injectable()
export class GoFreteNavigatorService {
  private readonly logger = new Logger(GoFreteNavigatorService.name);

  constructor(private readonly configService: ConfigService) {}

  async createBrowser(): Promise<Browser> {
    const headless = this.configService.get<boolean>(
      'app.playwrightHeadless',
      true
    );

    return chromium.launch({ headless });
  }

  async signInPage(browser: Browser, signInPage: SignInPage): Promise<Page> {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { loginUrl, username, password } = signInPage;

    this.logger.log(`Navigating to login URL: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    await page
      .locator('input[name$="input-8"], input[id$="input-8"]')
      .first()
      .fill(username);
    await page
      .locator('input[name$="input-9"], input[id$="input-9"]')
      .first()
      .fill(password);

    await Promise.all([
      page.waitForURL((url) => !url.pathname.toLowerCase().includes('entrar'), {
        timeout: 60000
      }),
      page.getByRole('button', { name: 'Entrar' }).click()
    ]);

    await page.waitForLoadState('networkidle');

    return page;
  }

  async containsNoResultMessage(page: Page): Promise<boolean> {
    await page.waitForLoadState('networkidle');

    const locator = page.getByText('Nenhum resultado');

    const counter = await locator.count();

    return counter > 0;
  }

  async goToShipmentPage(
    page: Page,
    status: string,
    pagination: Pagination
  ): Promise<void> {
    const baseUrl = new URL(page.url()).origin;
    const shipmentsUrl = new URL('/Pedidos', baseUrl);

    shipmentsUrl.searchParams.append('Page', pagination.pageNumber.toString());
    shipmentsUrl.searchParams.append(
      'PageSize',
      pagination.pageSize.toString()
    );
    shipmentsUrl.searchParams.append('OrderBy', pagination.orderBy);
    shipmentsUrl.searchParams.append('Situation', status);

    this.logger.log(`navigating to ${shipmentsUrl.toString()}`);

    await page.goto(shipmentsUrl.toString(), {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });
  }

  async goToTrackingPage(page: Page, shipmentId: string): Promise<void> {
    const baseUrl = new URL(page.url()).origin;
    const shipmentsUrl = new URL('/Rastreamento', baseUrl);

    shipmentsUrl.searchParams.append('query', shipmentId);

    this.logger.log(`navigating to ${shipmentsUrl.toString()}`);

    await page.goto(shipmentsUrl.toString(), {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });
  }

  async readShipmentTable(page: Page): Promise<Locator> {
    await page.waitForSelector('table tbody tr');
    return page.locator('table tbody tr');
  }

  async goToNextPage(page: Page) {
    await Promise.all([
      await page.locator('button:has(i.mdi-chevron-right)').click()
    ]);

    await page.waitForLoadState('networkidle');
  }

  async extractShipmentDataFromTable(
    tableRows: Locator
  ): Promise<ShipmentRow[]> {
    const count = await tableRows.count();

    const shipmentRows: ShipmentRow[] = [];

    for (let i = 0; i < count; i++) {
      const row = tableRows.nth(i);

      const trackNumber = await row.locator('td').nth(0).innerText();
      const status = await row.locator('td').nth(1).innerText();
      const invoice = await row.locator('td').nth(2).innerText();
      const origin = await row.locator('td').nth(3).innerText();
      const destination = await row.locator('td').nth(4).innerText();
      const startedAt = await row.locator('td').nth(5).innerText();
      const deliveryEstimate = await row.locator('td').nth(6).innerText();
      const value = await row.locator('td').nth(7).innerText();

      shipmentRows.push({
        shipmentId: trackNumber.trim(),
        status: status.trim(),
        invoiceNumber: invoice.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        startedAt: startedAt.trim(),
        deliveryEstimate: deliveryEstimate.trim(),
        value: value.trim()
      });
    }

    return shipmentRows;
  }

  async extractTrackingDataFromPage(page: Page): Promise<TrackingData> {
    // Wait for the header labels to exist
    await page.waitForSelector('text=Transportadora');
    await page.waitForSelector('text=Previsão de entrega');

    const data = await page.evaluate<TrackingData>(() => {
      const normalize = (s?: string | null) =>
        (s ?? '')
          .replace(/\u00A0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      // Finds value that appears right after a label in the "header cards"
      const getHeaderValueByLabel = (labelText: string): string => {
        const label = Array.from(document.querySelectorAll('div')).find(
          (el) => normalize(el.textContent) === labelText
        );

        if (!label) return '';

        // In your HTML, the value is the next sibling <div class="text-xs text-gray-500">
        const valueEl = label.parentElement?.querySelector(
          'div.text-xs.text-gray-500'
        );
        return normalize(valueEl?.textContent);
      };

      const transportadora = getHeaderValueByLabel('Transportadora');
      const previsaoEntrega = getHeaderValueByLabel('Previsão de entrega');

      // Each timeline entry starts with: <div class="flex mx-2"> ... date/time ... status/description ...
      const eventNodes = Array.from(document.querySelectorAll('div.flex.mx-2'));

      const eventos = eventNodes
        .map((node) => {
          // date + time are on the left: two divs (text-black for date, text-gray-500 for time)
          const dateEl = node.querySelector(
            '.w-32 .text-right.text-sm.text-black'
          );
          const timeEl = node.querySelector(
            '.w-32 .text-right.text-xs.text-gray-500'
          );

          // status + description on the right
          const statusEl = node.querySelector('.text-left.text-sm.font-medium');
          const descEl = node.querySelector('.text-left.text-xs.text-gray-500');

          const date = normalize(dateEl?.textContent);
          const time = normalize(timeEl?.textContent);
          const status = normalize(statusEl?.textContent);
          const description = normalize(descEl?.textContent) || null;

          // If this "flex mx-2" isn't actually an event row, skip it
          if (!date && !time && !status) return null;

          return { date, time, status, description };
        })
        .filter((e): e is TrackingEvent => Boolean(e));

      return {
        carrier: transportadora,
        estimateDate: previsaoEntrega,
        events: eventos
      };
    });

    return data;
  }
}
