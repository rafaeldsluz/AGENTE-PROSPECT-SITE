import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import UserAgent from "user-agents";
import { randomDelay, sleep } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { createModuleLogger } from "../../utils/logger.js";
import { extractPossibleWhatsApp, normalizePhone } from "../../utils/phone.js";
import type { BusinessRaw } from "../../types/business.types.js";

const log = createModuleLogger("scraper");

const BLOCKED_RESOURCES = new Set(["image", "media", "font", "stylesheet"]);

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
      extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
    });

    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt"] });
    });

    // Bloqueia recursos desnecessários — maior ganho de velocidade
    await this.context.route("**/*", (route) => {
      if (BLOCKED_RESOURCES.has(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });

    log.info("Browser Playwright inicializado (reutilizável)");
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
          await page.goto(
            `https://www.google.com.br/maps/search/${encodeURIComponent(searchQuery)}`,
            { waitUntil: "domcontentloaded", timeout: 30_000 }
          );
          await page.waitForSelector('[role="feed"], [role="main"]', { timeout: 20_000 });
        },
        { maxAttempts: 3, baseDelayMs: 3_000, maxDelayMs: 12_000 }
      );

      await this.handleCookieConsent(page);

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
      if (await acceptButton.isVisible({ timeout: 2_000 })) {
        await acceptButton.click();
        await sleep(500);
      }
    } catch {
      // sem popup de cookies
    }
  }

  private async extractListings(page: Page, maxResults: number, city: string): Promise<BusinessRaw[]> {
    const results: BusinessRaw[] = [];
    const sidebar = page.locator('[role="feed"]');

    try {
      await sidebar.waitFor({ timeout: 10_000 });
    } catch {
      log.warn("Lista de resultados não encontrada");
      return results;
    }

    const seenHrefs = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 15;

    while (results.length < maxResults && scrollAttempts < maxScrollAttempts) {
      // Coleta todos os hrefs visíveis de uma vez (sem round-trip por link)
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]'))
          .map((a) => a.getAttribute("href") ?? "")
          .filter((h) => h.includes("/maps/place/"))
      );

      const newHrefs = hrefs.filter((h) => !seenHrefs.has(h));
      if (newHrefs.length === 0) {
        // Nenhum item novo após scroll — fim da lista
        break;
      }

      for (const href of newHrefs) {
        if (results.length >= maxResults) break;
        seenHrefs.add(href);

        try {
          const link = page.locator(`a[href="${href}"]`).first();
          await link.click();

          // Espera apenas o elemento que precisamos, sem sleep fixo
          await page.waitForSelector('[role="main"] h1', { timeout: 8_000 });

          const business = await this.extractBusinessDetails(page, city);
          if (business) {
            results.push(business);
            log.debug({ name: business.name }, "Business extraído");
          }

          // Delay humano entre negócios: 1.5-4s (era 5-15s)
          await randomDelay(1_500, 4_000);
        } catch (err) {
          log.debug({ href, error: String(err) }, "Erro ao extrair negócio");
        }
      }

      if (results.length < maxResults) {
        await sidebar.evaluate((el) => el.scrollBy(0, 600));
        await randomDelay(800, 1_800);
        scrollAttempts++;
      }
    }

    return results;
  }

  private async extractBusinessDetails(page: Page, city: string): Promise<BusinessRaw | null> {
    try {
      // Extrai todos os campos em uma única chamada ao browser — elimina round-trips sequenciais
      const raw = await page.evaluate(() => {
        const main = document.querySelector('[role="main"]');
        if (!main) return null;

        const name = main.querySelector("h1")?.textContent?.trim() ?? null;
        if (!name) return null;

        // Categoria
        const categoryEl =
          main.querySelector('button[jsaction*="category"]') ??
          main.querySelector('[data-attrid="subtitle"]');
        const category = categoryEl?.textContent?.trim() ?? "";

        // Endereço — data-item-id é mais estável que classes obfuscadas
        const addressBtn = main.querySelector<HTMLElement>(
          '[data-item-id="address"], button[aria-label*="Endereço"], button[aria-label*="Address"]'
        );
        const address =
          addressBtn?.querySelector(".Io6YTe, .rogA2c, [class*='fontBodyMedium']")?.textContent?.trim() ??
          addressBtn?.getAttribute("aria-label")?.replace(/^[^:]+:\s*/, "").trim() ??
          "";

        // Telefone — tenta via texto visível, fallback no aria-label
        const phoneBtn = main.querySelector<HTMLElement>(
          '[data-item-id*="phone"], button[aria-label*="Telefone"], button[aria-label*="Phone"]'
        );
        const phone =
          phoneBtn?.querySelector(".Io6YTe, .rogA2c, [class*='fontBodyMedium']")?.textContent?.trim() ??
          phoneBtn?.getAttribute("aria-label")?.replace(/^[^:]+:\s*/, "").trim() ??
          null;

        // Website — texto do link (domínio visível), não o href que pode ser redirect do Google
        const websiteLink = main.querySelector<HTMLAnchorElement>(
          'a[data-item-id="authority"], a[aria-label*="Site"], a[aria-label*="Website"]'
        );
        const website =
          websiteLink?.querySelector(".Io6YTe, [class*='fontBodyMedium']")?.textContent?.trim() ??
          websiteLink?.textContent?.trim() ??
          null;

        // Rating — usa aria-label que é mais estável ("4,3 estrelas")
        const ratingEl = main.querySelector<HTMLElement>(
          '[aria-label*="estrela"], [aria-label*="star"], span.ceNzKf, span.MW4etd'
        );
        const ratingRaw =
          ratingEl?.getAttribute("aria-label")?.match(/[\d,\.]+/)?.[0] ??
          ratingEl?.textContent?.trim() ??
          null;

        // Contagem de avaliações
        const reviewBtn = main.querySelector<HTMLElement>('button[aria-label*="avaliações"], button[aria-label*="reviews"], button[jsaction*="reviewSort"]');
        const reviewRaw =
          reviewBtn?.getAttribute("aria-label")?.match(/[\d.,]+/)?.[0] ??
          reviewBtn?.textContent?.trim() ??
          null;

        // PlaceId via URL canônica
        const canonicalUrl = window.location.href;
        const placeIdMatch = canonicalUrl.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
        const placeId = placeIdMatch?.[0] ?? canonicalUrl.match(/place\/([^/]+)/)?.[1] ?? "";

        return { name, category, address, phone, website, ratingRaw, reviewRaw, placeId, canonicalUrl };
      });

      if (!raw) return null;

      const normalizedPhone = raw.phone ? normalizePhone(raw.phone) : null;
      const whatsapp = normalizedPhone ? extractPossibleWhatsApp(normalizedPhone) : null;
      const rating = raw.ratingRaw ? parseFloat(raw.ratingRaw.replace(",", ".")) : null;
      const reviewCount = raw.reviewRaw ? parseInt(raw.reviewRaw.replace(/\D/g, "")) : null;

      return {
        placeId: raw.placeId || `${normalizedPhone ?? ""}${Date.now()}`,
        name: raw.name.trim(),
        category: raw.category.trim(),
        address: raw.address.trim(),
        city,
        phone: normalizedPhone,
        whatsapp: whatsapp ?? normalizedPhone,
        website: raw.website?.trim() ?? null,
        rating: rating !== null && !isNaN(rating) ? rating : null,
        reviewCount: reviewCount !== null && !isNaN(reviewCount) ? reviewCount : null,
        photos: [],
        logoUrl: null,
        instagram: null,
        facebook: null,
        googleMapsUrl: raw.canonicalUrl,
        scrapedAt: new Date(),
      };
    } catch (err) {
      log.debug({ error: String(err) }, "Erro ao extrair detalhes");
      return null;
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    log.info("Browser encerrado");
  }
}
