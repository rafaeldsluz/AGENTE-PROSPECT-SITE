import axios from "axios";
import { extractDomain, isSocialOrDirectoryDomain } from "./domain-checker.js";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("validator:social-bio");

export interface SocialBioResult {
  hasExternalSite: boolean;
  siteUrl: string | null;
  layerWorked: boolean;
}

const NEUTRAL: SocialBioResult = { hasExternalSite: false, siteUrl: null, layerWorked: false };

export async function checkSocialBio(
  instagram: string | null,
  facebook: string | null
): Promise<SocialBioResult> {
  if (!instagram && !facebook) return NEUTRAL;

  if (instagram) {
    const result = await checkInstagramBio(instagram);
    if (result.layerWorked) return result;
  }

  if (facebook) {
    const result = await checkFacebookBio(facebook);
    if (result.layerWorked) return result;
  }

  return NEUTRAL;
}

async function checkInstagramBio(raw: string): Promise<SocialBioResult> {
  const username = raw
    .replace(/^@/, "")
    .replace(/.*instagram\.com\//i, "")
    .replace(/[/?#].*/g, "")
    .trim();

  if (!username || username.length < 2) return NEUTRAL;

  try {
    const response = await axios.get<string>(`https://www.instagram.com/${username}/`, {
      timeout: 10_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      responseType: "text",
      validateStatus: (s) => s < 500,
    });

    const html = (response.data as string) ?? "";

    if (response.status === 404 || html.toLowerCase().includes("page not found")) {
      return { hasExternalSite: false, siteUrl: null, layerWorked: true };
    }

    // Tenta extrair external_url do JSON embutido
    const externalMatch = html.match(/"external_url"\s*:\s*"([^"]+)"/);
    if (externalMatch?.[1]) {
      const url = safeDecodeUrl(externalMatch[1]);
      if (url && isBusinessUrl(url)) {
        log.debug({ username, url }, "URL externa detectada no Instagram");
        return { hasExternalSite: true, siteUrl: url, layerWorked: true };
      }
    }

    // Tenta extrair campo website de schema.org ou JSON-LD
    const websiteMatch = html.match(/"website"\s*:\s*"([^"]+)"/);
    if (websiteMatch?.[1]) {
      const url = safeDecodeUrl(websiteMatch[1]);
      if (url && isBusinessUrl(url) && !url.includes("instagram.")) {
        return { hasExternalSite: true, siteUrl: url, layerWorked: true };
      }
    }

    return { hasExternalSite: false, siteUrl: null, layerWorked: true };
  } catch (err) {
    log.debug({ username, error: String(err) }, "Instagram bloqueou acesso");
    return NEUTRAL;
  }
}

async function checkFacebookBio(raw: string): Promise<SocialBioResult> {
  const pageId = raw
    .replace(/.*facebook\.com\//i, "")
    .replace(/[/?#].*/g, "")
    .replace(/^@/, "")
    .trim();

  if (!pageId || pageId.length < 2) return NEUTRAL;

  try {
    const response = await axios.get<string>(`https://www.facebook.com/${pageId}`, {
      timeout: 10_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      responseType: "text",
      validateStatus: (s) => s < 500,
    });

    const html = (response.data as string) ?? "";

    const websiteMatch = html.match(/"website":"([^"]+)"/);
    if (websiteMatch?.[1]) {
      const url = safeDecodeUrl(websiteMatch[1]);
      if (url && isBusinessUrl(url) && !url.includes("facebook.")) {
        log.debug({ pageId, url }, "Website detectado no Facebook");
        return { hasExternalSite: true, siteUrl: url, layerWorked: true };
      }
    }

    // Tenta detectar link externo em og:see_also ou similar
    const seeAlsoMatch = html.match(/og:see_also.*?content="([^"]+)"/i);
    if (seeAlsoMatch?.[1]) {
      const url = safeDecodeUrl(seeAlsoMatch[1]);
      if (url && isBusinessUrl(url) && !url.includes("facebook.")) {
        return { hasExternalSite: true, siteUrl: url, layerWorked: true };
      }
    }

    return { hasExternalSite: false, siteUrl: null, layerWorked: true };
  } catch {
    return NEUTRAL;
  }
}

function safeDecodeUrl(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    return decoded.startsWith("http") ? decoded : null;
  } catch {
    return raw.startsWith("http") ? raw : null;
  }
}

function isBusinessUrl(url: string): boolean {
  try {
    const domain = extractDomain(url);
    return !isSocialOrDirectoryDomain(domain);
  } catch {
    return false;
  }
}
