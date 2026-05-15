import axios from "axios";
import {
  extractDomain,
  isSocialOrDirectoryDomain,
  isDomainActive,
  isUrlAccessible,
  generateDomainCandidates,
} from "./domain-checker.js";
import { createModuleLogger } from "../../utils/logger.js";
import { randomDelay } from "../../utils/delay.js";
import type { BusinessRaw, WebsiteValidationResult } from "../../types/business.types.js";

const log = createModuleLogger("validator");

interface ValidationCheck {
  source: string;
  result: boolean;
  detail: string;
  weight: number;
}

export class WebsiteValidator {
  async validate(business: BusinessRaw): Promise<WebsiteValidationResult> {
    log.info({ name: business.name }, "Validando presença web");

    const checks: ValidationCheck[] = [];

    // ── Check 1: Website declarado no Google Maps ──────────────────────────
    if (business.website) {
      const domain = extractDomain(business.website);
      const isSocial = isSocialOrDirectoryDomain(domain);

      if (!isSocial) {
        const active = await isUrlAccessible(business.website);
        checks.push({
          source: "google_maps_website",
          result: active,
          detail: `Website declarado: ${business.website} (ativo: ${active})`,
          weight: 0.95,
        });
      } else {
        log.debug({ website: business.website }, "Website é rede social/diretório, ignorando");
      }
    }

    // ── Check 2: Instagram bio link ──────────────────────────────────────
    if (business.instagram) {
      const bioLink = await this.extractInstagramBioLink(business.instagram);
      if (bioLink) {
        const domain = extractDomain(bioLink);
        if (!isSocialOrDirectoryDomain(domain)) {
          const active = await isUrlAccessible(bioLink);
          checks.push({
            source: "instagram_bio",
            result: active,
            detail: `Link na bio do Instagram: ${bioLink}`,
            weight: 0.85,
          });
        }
      }
    }

    // ── Check 3: Domínios candidatos baseados no nome da empresa ─────────
    if (!checks.some((c) => c.result)) {
      const candidates = generateDomainCandidates(business.name);
      for (const candidate of candidates.slice(0, 3)) {
        await randomDelay(500, 1_500);
        const active = await isDomainActive(candidate);
        if (active) {
          const accessible = await isUrlAccessible(candidate);
          if (accessible) {
            checks.push({
              source: "domain_candidate",
              result: true,
              detail: `Domínio candidato ativo: ${candidate}`,
              weight: 0.7,
            });
            break;
          }
        }
      }
    }

    // ── Check 4: Busca Google pelo nome da empresa ───────────────────────
    if (!checks.some((c) => c.result)) {
      const googleResult = await this.searchGoogleForWebsite(business.name, business.city);
      if (googleResult) {
        checks.push({
          source: "google_search",
          result: true,
          detail: `Site encontrado via Google: ${googleResult}`,
          weight: 0.75,
        });
      }
    }

    return this.computeResult(checks);
  }

  private computeResult(checks: ValidationCheck[]): WebsiteValidationResult {
    const positiveChecks = checks.filter((c) => c.result);

    if (positiveChecks.length === 0) {
      return {
        hasOwnWebsite: false,
        websiteUrl: null,
        confidence: 0.9,
        reason: "Nenhuma evidência de site próprio encontrada",
        checkedAt: new Date(),
      };
    }

    const topCheck = positiveChecks.sort((a, b) => b.weight - a.weight)[0];
    const websiteUrl = this.extractUrl(topCheck?.detail ?? "");

    return {
      hasOwnWebsite: true,
      websiteUrl: websiteUrl,
      confidence: topCheck?.weight ?? 0.5,
      reason: topCheck?.detail ?? "Site próprio detectado",
      checkedAt: new Date(),
    };
  }

  private extractUrl(detail: string): string | null {
    const match = detail.match(/https?:\/\/[^\s]+/);
    if (match) return match[0] ?? null;
    // Tenta pegar domínio sem protocolo
    const domainMatch = detail.match(/([a-z0-9-]+\.(com\.br|com|net\.br|net|org\.br))/i);
    return domainMatch ? `https://${domainMatch[0]}` : null;
  }

  private async extractInstagramBioLink(instagramUrl: string): Promise<string | null> {
    try {
      // Tenta obter o username e verificar a bio via scraping leve
      const usernameMatch = instagramUrl.match(/instagram\.com\/([^/?]+)/);
      if (!usernameMatch) return null;

      const username = usernameMatch[1];
      if (!username) return null;

      // Usa a API não oficial do Instagram para obter dados básicos
      const response = await axios.get(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
        timeout: 8_000,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)",
          "Accept": "application/json",
          "x-ig-app-id": "936619743392459",
        },
        validateStatus: (s) => s < 500,
      });

      if (response.status === 200 && response.data?.data?.user?.external_url) {
        return response.data.data.user.external_url as string;
      }
    } catch {
      // Ignorar erros silenciosamente - Instagram protege contra scraping
    }
    return null;
  }

  private async searchGoogleForWebsite(companyName: string, city: string): Promise<string | null> {
    try {
      const query = `"${companyName}" "${city}" site`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`;

      const response = await axios.get(searchUrl, {
        timeout: 10_000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        validateStatus: (s) => s < 500,
      });

      if (response.status !== 200) return null;

      const html = response.data as string;

      // Procura por links de resultados orgânicos que não sejam sociais/diretórios
      const linkRegex = /href="(https?:\/\/[^"]+)"/g;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        if (!url) continue;

        const domain = extractDomain(url);
        if (!isSocialOrDirectoryDomain(domain) && !domain.includes("google.")) {
          if (await isUrlAccessible(url)) {
            return url;
          }
        }
      }
    } catch {
      // Ignorar erros de busca Google
    }
    return null;
  }
}

export const websiteValidator = new WebsiteValidator();
