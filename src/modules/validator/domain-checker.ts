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
  // Domínios genéricos que geram falsos positivos no gerador de candidatos
  "resultados.com", "resultados.com.br",
  "patrocinado.com.br", "patrocinado.com",
  "servicos.com.br", "servicos.com",
  "empresa.com.br", "empresa.com",
  "negocios.com.br", "negocios.com",
]);

// Decodifica URLs de redirecionamento do Google (/url?q=https://...) para obter o destino real
export function resolveGoogleRedirect(url: string): string {
  if (!url) return url;
  const qMatch = url.match(/[?&]q=(https?%3A[^&]+|https?:\/\/[^&]+)/);
  if (qMatch?.[1]) {
    try { return decodeURIComponent(qMatch[1]); } catch { /* fallthrough */ }
  }
  return url;
}

export function extractDomain(url: string): string {
  const resolved = resolveGoogleRedirect(url);
  try {
    const parsed = new URL(resolved.startsWith("http") ? resolved : `https://${resolved}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return resolved.toLowerCase().replace(/^www\./, "");
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
    const resolved = resolveGoogleRedirect(url);
    const fullUrl = resolved.startsWith("http") ? resolved : `https://${resolved}`;
    // validateStatus: () => true — qualquer resposta HTTP (incluindo 403/401/405)
    // significa que o servidor existe. Só erramos na ausência de conexão.
    await withRetry(
      () => axios.head(fullUrl, {
        timeout: 8_000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectorBot/1.0)" },
        validateStatus: () => true,
      }),
      { maxAttempts: 2, baseDelayMs: 2_000, maxDelayMs: 6_000 }
    );
    return true;
  } catch {
    // Tenta HTTP como fallback
    try {
      const resolved = resolveGoogleRedirect(url);
      const httpUrl = resolved.startsWith("http") ? resolved.replace("https://", "http://") : `http://${resolved}`;
      await axios.head(httpUrl, {
        timeout: 8_000,
        maxRedirects: 5,
        validateStatus: () => true,
      });
      return true;
    } catch {
      return false;
    }
  }
}

const CMS_SIGNATURES = [
  "wp-content", "wp-includes", "wordpress",
  ".wixsite.com", "wix.com/", "wixstatic.com",
  "webflow.io", ".webflow.com",
  "cdn.shopify", "myshopify.com",
  "nuvemshop.com.br", "lojaintegrada.com.br",
  "carrd.co", "framer.com",
  "notion.site", "sites.google.com",
  "squarespace.com", "godaddy.com/website-builder",
] as const;

export async function detectCMS(url: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await axios.get<string>(fullUrl, {
      timeout: 6_000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectorBot/1.0)" },
      validateStatus: (s) => s === 200,
      responseType: "text",
    });
    const html = (response.data ?? "").slice(0, 8_192).toLowerCase();
    return CMS_SIGNATURES.some((sig) => html.includes(sig.toLowerCase()));
  } catch {
    return false;
  }
}

// Padrões em HTML que indicam domínio estacionado ou à venda
const PARKING_SIGNATURES = [
  "domain for sale", "buy this domain", "domain parking", "parked by",
  "this domain is parked", "godaddy.com/parking", "sedoparking",
  "hugedomains.com", "dan.com", "afternic.com", "domainmarket.com",
  "register4less", "domínio à venda", "este domínio está à venda",
  "parking page", "this web page is parked",
] as const;

export async function isParkedPage(url: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await axios.get<string>(fullUrl, {
      timeout: 8_000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectorBot/1.0)" },
      validateStatus: (s) => s === 200,
      responseType: "text",
    });
    // Lê só os primeiros 4 KB — suficiente para detectar páginas de parking
    const snippet = (response.data ?? "").slice(0, 4_096).toLowerCase();
    return PARKING_SIGNATURES.some((sig) => snippet.includes(sig));
  } catch {
    return false;
  }
}

const NICHE_DOMAIN_SUFFIXES: Record<string, string[]> = {
  advogado:   ["adv", "advocacia", "advogados", "juridico", "law"],
  clinica:    ["clinica", "saude", "consultorio", "med", "odonto"],
  automoveis: ["auto", "veiculos", "motors", "automotiva", "cars"],
  imoveis:    ["imoveis", "imobiliaria", "corretor", "real"],
  comercio:   ["loja", "store", "shop", "comercio"],
};

export function generateDomainCandidates(companyName: string, niche?: string): string[] {
  const base = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

  if (base.length >= 3) {
    candidates.add(`${base}.com.br`);
    candidates.add(`${base}.com`);
    candidates.add(`${base}.net.br`);
  }

  if (words.length >= 2) {
    const twoWords = words.slice(0, 2).join("");
    candidates.add(`${twoWords}.com.br`);
    candidates.add(`${twoWords}.com`);
  }

  const firstWord = words[0];
  if (firstWord && firstWord.length >= 4) {
    candidates.add(`${firstWord}.com.br`);
    candidates.add(`${firstWord}.com`);
  }

  // Candidatos com sufixo de nicho
  const nicheSuffixes = niche ? (NICHE_DOMAIN_SUFFIXES[niche] ?? []) : [];
  for (const suffix of nicheSuffixes) {
    if (base.length >= 3) candidates.add(`${base}${suffix}.com.br`);
    if (firstWord && firstWord.length >= 4) candidates.add(`${firstWord}${suffix}.com.br`);
  }

  log.debug({ companyName, niche, candidateCount: candidates.size }, "Domínios candidatos gerados");
  return [...candidates];
}
