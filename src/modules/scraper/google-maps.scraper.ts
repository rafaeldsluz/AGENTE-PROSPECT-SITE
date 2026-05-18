import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import UserAgent from "user-agents";
import { betweenActionsDelay, betweenPagesDelay, randomDelay, sleep } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { createModuleLogger } from "../../utils/logger.js";
import { extractPossibleWhatsApp, normalizePhone } from "../../utils/phone.js";
import type { BusinessRaw } from "../../types/business.types.js";

const log = createModuleLogger("scraper");

interface ScraperOptions {
  maxResults: number;
  city: string;
  headless?: boolean;
}

const NICHE_QUERIES: Record<string, string[]> = {
  oficina: ["oficina mecânica", "auto center", "mecânico de carros"],
  clinica: ["clínica médica", "consultório médico", "clínica odontológica", "dentista"],
  restaurante: ["restaurante", "lanchonete", "pizzaria", "hamburgueria"],
  academia: ["academia de ginástica", "crossfit", "musculação"],
  imoveis: ["imobiliária", "corretor de imóveis", "consultoria imobiliária"],
  estetica: ["salão de beleza", "barbearia", "estética", "nail art"],
  loja: ["loja de roupas", "loja de calçados", "pet shop"],
  servicos: ["dedetizadora", "chaveiro", "encanador", "eletricista"],
};

export function getNicheQueries(niches: string[]): string[] {
  if (niches.length === 0) {
    return Object.values(NICHE_QUERIES).flat();
  }
  return niches.flatMap((n) => NICHE_QUERIES[n] ?? []);
}

export class GoogleMapsScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async initialize(): Promise<void> {
    log.info("Inicializando browser Playwright");
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--lang=pt-BR",
      ],
    });

    const userAgent = new UserAgent({ deviceCategory: "desktop" });

    this.context = await this.browser.newContext({
      userAgent: userAgent.toString(),
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    // Injeta scripts anti-detecção
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt"] });
    });
  }

  async scrapeQuery(query: string, options: ScraperOptions): Promise<BusinessRaw[]> {
    if (!this.context) throw new Error("Scraper não inicializado");

    const searchQuery = `${query} em ${options.city}`;
    log.info({ query: searchQuery }, "Iniciando busca no Google Maps");

    const page = await this.context.newPage();
    const results: BusinessRaw[] = [];

    try {
      await withRetry(
        async () => {
          await page.goto(`https://www.google.com.br/maps/search/${encodeURIComponent(searchQuery)}`, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          // Aguarda o sidebar de resultados aparecer após a navegação
          await page.waitForSelector('[role="feed"], [role="main"]', { timeout: 20_000 });
        },
        { maxAttempts: 3, baseDelayMs: 3_000, maxDelayMs: 15_000 }
      );

      await betweenActionsDelay();
      await this.handleCookieConsent(page);
      await betweenActionsDelay();

      const listingResults = await this.extractListings(page, options.maxResults, options.city);
      results.push(...listingResults);

    } catch (err) {
      log.error({ query, error: String(err) }, "Erro ao buscar no Google Maps");
    } finally {
      await page.close();
    }

    return results;
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      const acceptButton = page.locator('button:has-text("Aceitar tudo"), button:has-text("Accept all")');
      if (await acceptButton.isVisible({ timeout: 3_000 })) {
        await acceptButton.click();
        await sleep(1_000);
      }
    } catch {
      // Sem popup de cookies, continuar normalmente
    }
  }

  private async extractListings(page: Page, maxResults: number, city: string): Promise<BusinessRaw[]> {
    const results: BusinessRaw[] = [];
    const sidebar = page.locator('[role="feed"]');

    // Aguarda a lista de resultados carregar
    try {
      await sidebar.waitFor({ timeout: 10_000 });
    } catch {
      log.warn("Lista de resultados não encontrada");
      return results;
    }

    let processedCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;

    while (processedCount < maxResults && scrollAttempts < maxScrollAttempts) {
      // Coleta links de negócios visíveis
      const businessLinks = await page.locator('a[href*="/maps/place/"]').all();
      const newLinks = businessLinks.slice(processedCount);

      for (const link of newLinks) {
        if (processedCount >= maxResults) break;

        try {
          const href = await link.getAttribute("href");
          if (!href || !href.includes("/maps/place/")) continue;

          await link.click();
          await betweenActionsDelay();

          const business = await this.extractBusinessDetails(page, city);
          if (business) {
            results.push(business);
            log.debug({ name: business.name }, "Business extraído");
            processedCount++;
          }

          await betweenPagesDelay();
        } catch (err) {
          log.debug({ error: String(err) }, "Erro ao extrair detalhe do negócio");
        }
      }

      if (processedCount < maxResults) {
        // Scroll para carregar mais resultados
        await sidebar.evaluate((el) => el.scrollBy(0, 500));
        await randomDelay(1_500, 3_000);
        scrollAttempts++;
      }
    }

    return results;
  }

  private async extractBusinessDetails(page: Page, city: string): Promise<BusinessRaw | null> {
    try {
      // Aguarda painel de detalhes abrir
      await page.waitForSelector('[role="main"] h1', { timeout: 8_000 });

      const name = await this.safeText(page, '[role="main"] h1');
      if (!name) return null;

      const category = await this.safeText(page, 'button[jsaction*="category"]') ??
        await this.safeText(page, '[data-item-id*="category"]') ?? "";

      const address = await this.safeText(page, '[data-item-id="address"] .Io6YTe') ??
        await this.safeText(page, 'button[data-item-id="address"]') ?? "";

      const phone = await this.safeText(page, '[data-item-id*="phone"] .Io6YTe') ??
        await this.safeText(page, 'button[data-item-id*="phone"] .rogA2c') ?? null;

      const websiteEl = await page.locator('[data-item-id="authority"] .Io6YTe').first();
      const website = await websiteEl.isVisible({ timeout: 2_000 })
        ? await websiteEl.textContent()
        : null;

      const ratingText = await this.safeText(page, 'div[role="main"] span[aria-hidden="true"].ceNzKf') ??
        await this.safeText(page, 'span.MW4etd') ?? null;

      const reviewText = await this.safeText(page, 'button[jsaction*="reviewSort"] span') ?? null;

      const rating = ratingText ? parseFloat(ratingText.replace(",", ".")) : null;
      const reviewCount = reviewText ? parseInt(reviewText.replace(/\D/g, "")) : null;

      // Fotos
      const photos: string[] = [];
      const photoImgs = await page.locator('button[jsaction*="heroHeader"] img, div[data-photo-index] img').all();
      for (const img of photoImgs.slice(0, 5)) {
        const src = await img.getAttribute("src");
        if (src && src.startsWith("http")) photos.push(src);
      }

      // Placeadd URL atual para extrair placeId
      const currentUrl = page.url();
      const placeIdMatch = currentUrl.match(/place\/([^/]+)/);
      const placeId = placeIdMatch?.[1] ?? `${normalizePhone(phone ?? "")}${Date.now()}`;

      // Logo (primeira imagem do perfil)
      const logoEl = await page.locator('img[decoding="async"][class*="YQ4gaf"]').first();
      const logoUrl = await logoEl.isVisible({ timeout: 2_000 })
        ? await logoEl.getAttribute("src")
        : null;

      const normalizedPhone = phone ? normalizePhone(phone) : null;
      const whatsapp = phone ? extractPossibleWhatsApp(normalizedPhone ?? phone) : null;

      return {
        placeId,
        name: name.trim(),
        category: category.trim(),
        address: address.trim(),
        city,
        phone: normalizedPhone,
        whatsapp: whatsapp ?? normalizedPhone,
        website: website?.trim() ?? null,
        rating: isNaN(rating ?? NaN) ? null : rating,
        reviewCount: isNaN(reviewCount ?? NaN) ? null : reviewCount,
        photos,
        logoUrl: logoUrl ?? null,
        instagram: null,
        facebook: null,
        googleMapsUrl: currentUrl,
        scrapedAt: new Date(),
      };
    } catch (err) {
      log.debug({ error: String(err) }, "Erro ao extrair detalhes");
      return null;
    }
  }

  private async safeText(page: Page, selector: string): Promise<string | null> {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2_000 })) {
        return (await el.textContent())?.trim() ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    log.info("Browser encerrado");
  }
}
