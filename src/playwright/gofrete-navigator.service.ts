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

export interface TrackRow {
  pedido: string;
  status: string;
  nfe: string;
  origem: string;
  destino: string;
  criado: string;
  prazo: string;
  valor: string;
}

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

    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForLoadState('networkidle');

    return page;
  }

  async containsNoResultMessage(page: Page): Promise<boolean> {
    const locator = page.getByText('Nenhum resultado');

    const counter = await locator.count();

    return counter > 0;
  }

  async readTrackTableByStatus(
    page: Page,
    status: string,
    pagination: Pagination
  ): Promise<Locator> {
    const baseUrl = new URL(page.url()).origin;
    const tracksUrl = new URL('/Pedidos', baseUrl);

    tracksUrl.searchParams.append('Page', pagination.pageNumber.toString());
    tracksUrl.searchParams.append('PageSize', pagination.pageSize.toString());
    tracksUrl.searchParams.append('OrderBy', pagination.orderBy);
    tracksUrl.searchParams.append('Situation', status);

    await page.goto(tracksUrl.toString(), {
      timeout: 60000
    });

    await page.waitForSelector('table tbody tr');

    return page.locator('table tbody tr');
  }

  async extractTrackDataFromRows(tableRows: Locator): Promise<TrackRow[]> {
    const count = await tableRows.count();

    const trackRows: TrackRow[] = [];

    for (let i = 0; i < count; i++) {
      const row = tableRows.nth(i);

      const pedido = await row.locator('td').nth(0).innerText();
      const status = await row.locator('td').nth(1).innerText();
      const nfe = await row.locator('td').nth(2).innerText();
      const origem = await row.locator('td').nth(3).innerText();
      const destino = await row.locator('td').nth(4).innerText();
      const criado = await row.locator('td').nth(5).innerText();
      const prazo = await row.locator('td').nth(6).innerText();
      const valor = await row.locator('td').nth(7).innerText();

      trackRows.push({
        pedido: pedido.trim(),
        status: status.trim(),
        nfe: nfe.trim(),
        origem: origem.trim(),
        destino: destino.trim(),
        criado: criado.trim(),
        prazo: prazo.trim(),
        valor: valor.trim()
      });
    }

    return trackRows;
  }
}
