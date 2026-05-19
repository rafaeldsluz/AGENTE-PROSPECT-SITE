import {
  extractDomain,
  isSocialOrDirectoryDomain,
  isDomainActive,
  isUrlAccessible,
  isParkedPage,
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

    // ── Check 2: Domínios .com.br baseados no nome da empresa ────────────
    // Só verifica TLD brasileiro para evitar falsos positivos em domínios
    // .com genéricos que pertencem a empresas diferentes em outros países
    if (!checks.some((c) => c.result)) {
      const candidates = generateDomainCandidates(business.name)
        .filter((c) => c.endsWith(".com.br"));
      for (const candidate of candidates.slice(0, 2)) {
        await randomDelay(300, 800);
        const active = await isDomainActive(candidate);
        if (active) {
          const accessible = await isUrlAccessible(candidate);
          if (accessible) {
            // Verifica se é página estacionada (falso positivo crítico)
            const parked = await isParkedPage(candidate);
            if (parked) {
              log.debug({ candidate }, "Domínio candidato está estacionado/à venda, ignorando");
              continue;
            }
            checks.push({
              source: "domain_candidate",
              result: true,
              detail: `Domínio candidato ativo: ${candidate}`,
              weight: 0.65,
            });
            break;
          }
        }
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

}

export const websiteValidator = new WebsiteValidator();
