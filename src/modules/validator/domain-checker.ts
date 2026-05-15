import { promises as dns } from "dns";
import axios from "axios";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";

const log = createModuleLogger("domain-checker");

// Domínios de redes sociais e bio links que NÃO são sites próprios
const SOCIAL_DOMAINS = new Set([
  "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
  "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
  "linktr.ee", "linktree.com", "bio.link", "linkbio.app",
  "taplink.cc", "beacons.ai", "koji.to", "allmylinks.com",
  "meulink.app", "bio.site", "carrd.co", "about.me",
  "google.com", "whatsapp.com", "t.me", "telegram.me",
  "wa.me", "bit.ly", "shorturl.at", "tinyurl.com",
]);

const DIRECTORY_DOMAINS = new Set([
  "guiamais.com.br", "apontador.com.br", "foursquare.com",
  "tripadvisor.com.br", "yelp.com", "ifood.com.br",
  "rappi.com.br", "uber.com", "99app.com",
  "booking.com", "airbnb.com", "olx.com.br",
  "mercadolivre.com.br", "shopee.com.br", "americanas.com.br",
]);

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}

export function isSocialOrDirectoryDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
  for (const social of SOCIAL_DOMAINS) {
    if (cleanDomain === social || cleanDomain.endsWith(`.${social}`)) return true;
  }
  for (const dir of DIRECTORY_DOMAINS) {
    if (cleanDomain === dir || cleanDomain.endsWith(`.${dir}`)) return true;
  }
  return false;
}

export async function isDomainActive(domain: string): Promise<boolean> {
  try {
    await dns.lookup(domain);
    return true;
  } catch {
    return false;
  }
}

export async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await withRetry(
      () => axios.head(fullUrl, {
        timeout: 8_000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectorBot/1.0)" },
        validateStatus: (status) => status < 500,
      }),
      { maxAttempts: 2, baseDelayMs: 2_000, maxDelayMs: 6_000 }
    );
    return response.status < 400;
  } catch {
    // Tenta HTTP como fallback
    try {
      const httpUrl = url.startsWith("http") ? url.replace("https://", "http://") : `http://${url}`;
      const response = await axios.head(httpUrl, {
        timeout: 8_000,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
      return response.status < 400;
    } catch {
      return false;
    }
  }
}

export function generateDomainCandidates(companyName: string): string[] {
  const base = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // Remove acentos
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");

  const words = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const candidates = new Set<string>();

  // Domínio direto
  if (base.length >= 3) {
    candidates.add(`${base}.com.br`);
    candidates.add(`${base}.com`);
    candidates.add(`${base}.net.br`);
  }

  // Primeiras 2 palavras
  if (words.length >= 2) {
    const twoWords = words.slice(0, 2).join("");
    candidates.add(`${twoWords}.com.br`);
    candidates.add(`${twoWords}.com`);
  }

  // Primeira palavra
  const firstWord = words[0];
  if (firstWord && firstWord.length >= 4) {
    candidates.add(`${firstWord}.com.br`);
    candidates.add(`${firstWord}.com`);
  }

  log.debug({ companyName, candidates: [...candidates] }, "Domínios candidatos gerados");
  return [...candidates];
}
