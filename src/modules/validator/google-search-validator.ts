import axios from "axios";
import { chromium, type Browser, type BrowserContext } from "playwright";
import UserAgent from "user-agents";
import { extractDomain, isSocialOrDirectoryDomain } from "./domain-checker.js";
import { createModuleLogger } from "../../utils/logger.js";
import { randomDelay } from "../../utils/delay.js";

const log = createModuleLogger("validator:google-search");

export interface GoogleSearchResult {
  foundBusinessSite: boolean;
  siteUrl: string | null;
  layerWorked: boolean;
}

const GOOGLE_BLOCK_SIGNATURES = [
  "captcha", "unusual traffic", "nosso sistema detectou",
  "sorry, we couldn't process", "recaptcha",
];

const SKIP_DOMAINS = new Set([
  "google.", "youtube.", "gov.br", "wikipedia.org",
  "jusbrasil.com.br", "escavador.com", "migalhas.com",
  "conjur.com.br", "estadao.com.br", "globo.com",
]);

class GoogleSearchValidator {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox", "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled",
        ],
      });
    }
    return this.browser;
  }

  async checkBusinessWebsite(companyName: string, city: string): Promise<GoogleSearchResult> {
    const query = `"${companyName}" ${city}`;

    try {
      const httpResult = await this.searchViaHttp(query, companyName);
      if (httpResult !== null) return { ...httpResult, layerWorked: true };

      await randomDelay(2_000, 4_000);
      const playwrightResult = await this.searchViaPlaywright(query, companyName);
      return { ...playwrightResult, layerWorked: true };
    } catch (err) {
      log.debug({ company: companyName, error: String(err) }, "Google Search indisponível, Layer 2 neutro");
      return { foundBusinessSite: false, siteUrl: null, layerWorked: false };
    }
  }

  private async searchViaHttp(
    query: string,
    companyName: string
  ): Promise<Omit<GoogleSearchResult, "layerWorked"> | null> {
    const ua = new UserAgent({ deviceCategory: "desktop" }).toString();

    try {
      const response = await axios.get<string>("https://www.google.com.br/search", {
        params: { q: query, hl: "pt-BR", num: 10 },
        timeout: 12_000,
        headers: {
          "User-Agent": ua,
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
        responseType: "text",
      });

      const html = (response.data as string) ?? "";
      if (GOOGLE_BLOCK_SIGNATURES.some((sig) => html.toLowerCase().includes(sig))) {
        log.debug({ query }, "Google bloqueou HTTP, tentando Playwright");
        return null;
      }

      return this.extractBusinessUrl(html, companyName);
    } catch {
      return null;
    }
  }

  private async searchViaPlaywright(
    query: string,
    companyName: string
  ): Promise<Omit<GoogleSearchResult, "layerWorked">> {
    let context: BrowserContext | null = null;

    try {
      const browser = await this.getBrowser();
      const ua = new UserAgent({ deviceCategory: "desktop" }).toString();

      context = await browser.newContext({
        userAgent: ua,
        locale: "pt-BR",
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9" },
      });

      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      await page.goto(
        `https://www.google.com.br/search?q=${encodeURIComponent(query)}&hl=pt-BR&num=10`,
        { waitUntil: "domcontentloaded", timeout: 20_000 }
      );
      await page.waitForTimeout(1_500);

      const html = await page.content();
      return this.extractBusinessUrl(html, companyName);
    } finally {
      await context?.close().catch(() => void 0);
    }
  }

  private extractBusinessUrl(
    html: string,
    companyName: string
  ): Omit<GoogleSearchResult, "layerWorked"> {
    // Extrai URLs de elementos cite (aparecem abaixo dos títulos no Google)
    const citeMatches = [...html.matchAll(/<cite[^>]*>(.*?)<\/cite>/gi)]
      .map((m) => m[1]!.replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.startsWith("http") || t.includes(".com") || t.includes(".br"));

    // Extrai todos os hrefs não-Google
    const hrefMatches = [...html.matchAll(/href="(https?:\/\/(?!(?:www\.)?google\.|translate\.google\.|webcache\.)[^"&]+)"/gi)]
      .map((m) => m[1]!);

    const allUrls = [
      ...citeMatches.map((c) => (c.startsWith("http") ? c : `https://${c}`)),
      ...hrefMatches,
    ];

    const nameWords = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    for (const url of allUrls) {
      try {
        const domain = extractDomain(url);
        if (isSocialOrDirectoryDomain(domain)) continue;
        if ([...SKIP_DOMAINS].some((skip) => domain.includes(skip))) continue;

        const domainFlat = domain.replace(/\W/g, "");
        if (nameWords.some((word) => domainFlat.includes(word))) {
          log.debug({ company: companyName, domain }, "Site detectado via Google Search");
          return { foundBusinessSite: true, siteUrl: url };
        }
      } catch { /* skip malformed */ }
    }

    return { foundBusinessSite: false, siteUrl: null };
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => void 0);
    this.browser = null;
  }
}

export const googleSearchValidator = new GoogleSearchValidator();
