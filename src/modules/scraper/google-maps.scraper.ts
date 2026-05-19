import { createHash } from "crypto";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import UserAgent from "user-agents";
import { randomDelay, sleep } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { createModuleLogger } from "../../utils/logger.js";
import { extractPossibleWhatsApp, normalizePhone } from "../../utils/phone.js";
import type { BusinessRaw } from "../../types/business.types.js";

const log = createModuleLogger("scraper");

// Não bloquear stylesheet — o Google Maps precisa deles para inicializar
const BLOCKED_RESOURCES = new Set(["media", "font"]);

interface ScraperOptions {
  maxResults: number;
  city: string;
  headless?: boolean;
}

// Regra geral: só incluir queries de negócios que (a) frequentemente não têm site
// e (b) teriam ganho real com presença digital profissional.
const NICHE_QUERIES: Record<string, string[]> = {
  // Clínicas: busca ativa de alta intenção — "dentista perto de mim", agendamento online
  clinica: [
    "clínica odontológica",
    "dentista",
    "clínica veterinária",
    "fisioterapia",
    "psicólogo",
    "clínica médica",
  ],
  // Imóveis: corretor independente perde lead sem site — comprador pesquisa no Google
  imoveis: [
    "imobiliária",
    "corretor de imóveis",
    "consultoria imobiliária",
  ],
  // Serviços: ninguém tem o contato salvo — procura no Google na hora da necessidade
  servicos: [
    "dedetizadora",
    "empresa de limpeza",
    "marmoraria",
    "chaveiro",
  ],
  // Advogados: credibilidade exige site, busca ativa por especialidade
  advogado: [
    "escritório de advocacia",
    "advogado trabalhista",
    "advogado criminal",
    "advogado imobiliário",
  ],
  // Comércio local: busca ativa no Google, pouca presença digital profissional
  comercio: [
    "ótica",
    "assistência técnica celular",
    "assistência técnica notebook",
    "gráfica",
    "loja de uniformes",
    "pet shop",
    "lavanderia",
    "loja de materiais de construção",
    "ferragem",
    "vidraçaria",
  ],
};

// Mapa reverso: query → niche (ex: "escritório de advocacia" → "advogado")
export const QUERY_TO_NICHE: Record<string, string> = Object.entries(NICHE_QUERIES).reduce(
  (acc, [niche, queries]) => {
    for (const q of queries) acc[q] = niche;
    return acc;
  },
  {} as Record<string, string>
);

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
    this.context = await this.createContext();
    log.info("Browser Playwright inicializado (reutilizável)");
  }

  private async createContext(): Promise<BrowserContext> {
    if (!this.browser) throw new Error("Browser não inicializado");
    const userAgent = new UserAgent({ deviceCategory: "desktop" });
    const ctx = await this.browser.newContext({
      userAgent: userAgent.toString(),
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt"] });
    });
    await ctx.route("**/*", (route) => {
      if (BLOCKED_RESOURCES.has(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
    return ctx;
  }

  // Descarta cookies/sessão anterior para evitar detecção como bot pelo Google.
  async resetContext(): Promise<void> {
    await this.context?.close();
    this.context = await this.createContext();
    log.info("Contexto do browser resetado (nova sessão)");
  }

  async scrapeQuery(
    query: string,
    options: ScraperOptions,
    onBusiness?: (b: BusinessRaw) => Promise<void>,
  ): Promise<BusinessRaw[]> {
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

      // Detecta bloqueio/CAPTCHA do Google antes de tentar extrair
      const currentUrl = page.url();
      if (currentUrl.includes("/sorry/") || currentUrl.includes("sorry.google")) {
        log.warn({ query }, "Google bloqueou a requisição (CAPTCHA/sorry) — pulando query");
        return results;
      }
      const hasCaptcha = await page.$('form#captcha-form, div#recaptcha, iframe[src*="recaptcha"]').catch(() => null);
      if (hasCaptcha) {
        log.warn({ query }, "Google exibiu CAPTCHA — pulando query");
        return results;
      }

      const listingResults = await this.extractListings(page, options.maxResults, options.city, onBusiness);
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

  private async extractListings(
    page: Page,
    maxResults: number,
    city: string,
    onBusiness?: (b: BusinessRaw) => Promise<void>,
  ): Promise<BusinessRaw[]> {
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
      // Detecta fim real da lista antes de tentar coletar hrefs
      const endOfList = await page.$('span:has-text("Você chegou ao fim"), span:has-text("You\'ve reached the end")');
      if (endOfList) {
        log.debug("Fim da lista detectado pelo Google Maps");
        break;
      }

      // Coleta todos os hrefs visíveis de uma vez (sem round-trip por link)
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]'))
          .map((a) => a.getAttribute("href") ?? "")
          .filter((h) => h.includes("/maps/place/"))
      );

      const newHrefs = hrefs.filter((h) => !seenHrefs.has(h));
      if (newHrefs.length === 0) {
        // Pode ser loading — tenta mais um scroll antes de desistir
        await sidebar.evaluate((el) => el.scrollBy(0, 300));
        await page.waitForSelector('[role="feed"] [aria-busy="true"]', { state: "hidden", timeout: 3_000 }).catch(() => {});
        scrollAttempts++;
        continue;
      }

      for (const href of newHrefs) {
        if (results.length >= maxResults) break;
        seenHrefs.add(href);

        try {
          const link = page.locator(`a[href="${href}"]`).first();
          await link.click();

          // Aguarda a URL mudar para uma página de place específico (evita capturar o h1 "Resultados" da lista)
          await page.waitForFunction(
            () => window.location.href.includes("/maps/place/"),
            { timeout: 8_000 }
          ).catch(() => {}); // se não mudar, extractBusinessDetails vai retornar null pelo guard interno

          await page.waitForSelector('[role="main"] h1', { timeout: 8_000 });
          // Aguarda elementos async (telefone, fotos, reviews) carregarem
          await sleep(700);

          const business = await this.extractBusinessDetails(page, city);
          if (business) {
            if (onBusiness) {
              try {
                await onBusiness(business);
              } catch (cbErr) {
                log.warn({ name: business.name, error: String(cbErr) }, "Erro no callback de negócio");
              }
            }
            results.push(business);
            log.debug({ name: business.name }, "Business extraído");
          }

          // Volta para a lista e aguarda o feed reaparecer
          await page.goBack({ waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => {});
          await page.waitForSelector('[role="feed"]', { timeout: 5_000 }).catch(() => {});

          // Delay humano entre negócios: 1.5-4s
          await randomDelay(1_500, 4_000);
        } catch (err) {
          log.debug({ href, error: String(err) }, "Erro ao extrair negócio");
        }
      }

      if (results.length < maxResults) {
        await sidebar.evaluate((el) => el.scrollBy(0, 600));
        // Aguarda spinner de carregamento sumir em vez de sleep fixo
        await page.waitForSelector('[role="feed"] [aria-busy="true"]', { state: "hidden", timeout: 3_000 }).catch(() => {});
        await randomDelay(600, 1_200);
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

        // Guard: só processa páginas de place específico, não a lista de resultados
        if (!window.location.href.includes("/maps/place/")) return null;

        const name = main.querySelector("h1")?.textContent?.trim() ?? null;
        if (!name) return null;

        // Filtra textos genéricos da UI do Google Maps que aparecem em race condition
        // Usa startsWith para cobrir variações como "Patrocinado", "Patrocinado ·", etc.
        const lowerName = name.toLowerCase();
        const GENERIC_PREFIXES = ["resultados", "results", "pesquisar", "search", "patrocinado", "sponsored"];
        if (GENERIC_PREFIXES.some(p => lowerName.startsWith(p))) return null;

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

        // Telefone — 3 estratégias em cascata
        let phone: string | null = null;
        // 1) data-item-id ou aria-label estruturado
        const phoneEl =
          main.querySelector<HTMLElement>('[data-item-id*="phone"]') ??
          main.querySelector<HTMLElement>('[data-tooltip*="Telefone"], [data-tooltip*="telefone"]') ??
          main.querySelector<HTMLElement>('button[aria-label*="Telefone"], button[aria-label*="Phone"], a[href^="tel:"]');
        if (phoneEl) {
          phone =
            phoneEl.querySelector(".Io6YTe, .rogA2c, [class*='fontBodyMedium']")?.textContent?.trim() ??
            phoneEl.getAttribute("aria-label")?.replace(/^[^:]+:\s*/, "").trim() ??
            phoneEl.getAttribute("href")?.replace("tel:", "").trim() ??
            null;
        }
        // 2) varredura por padrão de telefone brasileiro no texto dos botões/divs
        if (!phone) {
          const candidates = Array.from(main.querySelectorAll<HTMLElement>('[role="button"], button, div[class]'));
          for (const el of candidates) {
            const t = (el.childElementCount === 0 ? el.textContent?.trim() : null) ?? "";
            if (/^(\+55[\s-]?)?(\(?\d{2}\)?[\s-]?)[\d\s\-]{8,12}$/.test(t) && t.length <= 20) {
              phone = t; break;
            }
          }
        }
        // 3) regex direto no HTML do painel
        if (!phone) {
          const m = main.innerHTML.match(/(\+55[\s-]?)?(\(?\d{2}\)?[\s-]?)(\d{4,5}[\s-]\d{4})/);
          if (m) phone = m[0].replace(/\s{2,}/g, " ").trim();
        }

        // Website — href real tem prioridade (mais confiável que texto truncado)
        const websiteLink = main.querySelector<HTMLAnchorElement>(
          'a[data-item-id="authority"], a[aria-label*="Site"], a[aria-label*="Website"]'
        );
        const website =
          websiteLink?.getAttribute("href") ??
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

        // Contagem de avaliações — 3 estratégias
        let reviewRaw: string | null = null;
        const reviewBtn = main.querySelector<HTMLElement>(
          'button[aria-label*="avaliações"], button[aria-label*="reviews"], button[jsaction*="reviewSort"]'
        );
        if (reviewBtn) {
          reviewRaw =
            reviewBtn.getAttribute("aria-label")?.match(/[\d.,]+/)?.[0] ??
            reviewBtn.textContent?.match(/[\d.,]+/)?.[0] ??
            null;
        }
        // Padrão "(X.XXX)" comum na UI do Maps
        if (!reviewRaw) {
          const spans = Array.from(main.querySelectorAll<HTMLElement>("span, button"));
          for (const el of spans) {
            const t = el.textContent?.trim() ?? "";
            if (/^\([\d.,]+\)$/.test(t)) { reviewRaw = t.replace(/[()]/g, ""); break; }
          }
        }
        // Regex no HTML como último recurso
        if (!reviewRaw) {
          const m = main.innerHTML.match(/(\d[\d.,]*)\s*avalia[çc][oõ]e?s?/i);
          if (m) reviewRaw = m[1] ?? null;
        }

        // PlaceId via URL canônica
        const canonicalUrl = window.location.href;
        const placeIdMatch = canonicalUrl.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
        const placeId = placeIdMatch?.[0] ?? canonicalUrl.match(/place\/([^/]+)/)?.[1] ?? "";

        // Fotos — busca no documento todo (imagens ficam fora do [role="main"] em algumas versões)
        const cdnImgs = Array.from(
          document.querySelectorAll<HTMLImageElement>('img[src*="googleusercontent"], img[src*="ggpht"]')
        )
          .map((img) => img.src)
          .filter((src) => {
            if (!src || src.includes(".svg")) return false;
            if (src.includes("-c0x") || src.includes("-mo-br")) return false; // avatares de reviews
            if (/=s[0-9]{1,2}($|[^0-9])/.test(src)) return false;            // ícones < 100px
            return true;
          });
        const photoUrls = [...new Set(cdnImgs)].slice(0, 10);

        // Logo — tenta foto de perfil do Business Profile primeiro (imagem quadrada perto do h1),
        // depois capa da galeria, depois primeira foto disponível
        const profileImg = main.querySelector<HTMLImageElement>(
          'img[aria-label], button[aria-label*="foto"] img, [data-photo-index="0"] img, .RZ66Rb img'
        );
        const profileSrc = profileImg?.src ?? "";
        const isValidProfile = profileSrc.includes("googleusercontent") && !profileSrc.includes("-c0x");
        const logoUrl = (isValidProfile ? profileSrc : null) ?? photoUrls[0] ?? null;

        // Redes sociais declaradas no Google Business Profile
        const allAnchors = Array.from(main.querySelectorAll<HTMLAnchorElement>("a[href]"));
        const instagramAnchor = allAnchors.find((a) => a.href?.includes("instagram.com"));
        const facebookAnchor = allAnchors.find(
          (a) => a.href?.includes("facebook.com") && !a.href?.includes("google.com")
        );
        const instagram = instagramAnchor?.href?.split("?")[0]?.trim() ?? null;
        const facebook = facebookAnchor?.href?.split("?")[0]?.trim() ?? null;

        return {
          name, category, address, phone, website,
          ratingRaw, reviewRaw, placeId, canonicalUrl,
          photoUrls, logoUrl, instagram, facebook,
        };
      });

      if (!raw) return null;

      const normalizedPhone = raw.phone ? normalizePhone(raw.phone) : null;
      const whatsapp = normalizedPhone ? extractPossibleWhatsApp(normalizedPhone) : null;
      const rating = raw.ratingRaw ? parseFloat(raw.ratingRaw.replace(",", ".")) : null;
      const reviewCount = raw.reviewRaw ? parseInt(raw.reviewRaw.replace(/\D/g, "")) : null;

      return {
        placeId: raw.placeId || createHash("md5").update(`${raw.name}|${city}`).digest("hex"),
        name: raw.name.trim(),
        category: raw.category.trim(),
        address: raw.address.trim(),
        city,
        phone: normalizedPhone,
        whatsapp: whatsapp ?? normalizedPhone,
        website: raw.website?.trim() ?? null,
        rating: rating !== null && !isNaN(rating) ? rating : null,
        reviewCount: reviewCount !== null && !isNaN(reviewCount) ? reviewCount : null,
        photos: raw.photoUrls,
        logoUrl: raw.logoUrl,
        instagram: raw.instagram,
        facebook: raw.facebook,
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
