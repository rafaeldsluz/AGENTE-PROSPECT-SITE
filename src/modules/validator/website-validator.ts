import {
  extractDomain,
  isSocialOrDirectoryDomain,
  isDomainActive,
  isUrlAccessible,
  isParkedPage,
  detectCMS,
  generateDomainCandidates,
  resolveGoogleRedirect,
} from "./domain-checker.js";
import { googleSearchValidator } from "./google-search-validator.js";
import { checkSocialBio } from "./social-bio-validator.js";
import { createModuleLogger } from "../../utils/logger.js";
import { randomDelay } from "../../utils/delay.js";
import type { BusinessRaw, WebsiteValidationResult } from "../../types/business.types.js";

const log = createModuleLogger("validator");

/**
 * Score mínimo (0-100) para considerar que a empresa não possui site próprio.
 * Cada camada contribui pontos positivos (indício de ausência de site).
 * Disqualificação imediata zera o score ao encontrar evidência conclusiva de site.
 *
 * Distribuição máxima:
 *   Layer 1 (GMB website field)  — 35 pts
 *   Layer 2 (Google Search)      — 20 pts (0 se bloqueado)
 *   Layer 3 (Domain candidates)  — 30 pts
 *   Layer 4 (Social bio links)   — 15 pts (0 se bloqueado)
 * Total máximo: 100 pts
 */
const NO_WEBSITE_THRESHOLD = 70;

interface LayerResult {
  points: number;
  reason: string;
  immediateDisqualify: boolean;
  siteUrl: string | null;
}

/** Tenta inferir nicho a partir da categoria do Google Maps para gerar candidatos mais precisos */
function inferNicheFromCategory(category: string): string | undefined {
  const cat = category.toLowerCase();
  if (/advocac|advogad|juríd|jurídic|oab/.test(cat)) return "advogado";
  if (/clínica|médic|dentist|odontolog|fisiotera|psicolog|saúde|consultório/.test(cat)) return "clinica";
  if (/imobiliár|imóveis|corretor|construtora|incorporad/.test(cat)) return "imoveis";
  if (/automóv|veículos|oficina|mecânic|concessionár|multimarca|funilaria|auto center/.test(cat)) return "automoveis";
  if (/comércio|loja|ótica|pet shop|farmác|supermercad/.test(cat)) return "comercio";
  return undefined;
}

export class WebsiteValidator {
  async validate(business: BusinessRaw): Promise<WebsiteValidationResult> {
    log.info({ name: business.name }, "Iniciando validação probabilística de presença web");

    let noWebsiteScore = 0;
    const reasons: string[] = [];
    let foundWebsiteUrl: string | null = null;

    // ── Layer 1: Campo website no Google Business Profile (peso: 35) ──────────
    const l1 = await this.checkLayer1(business);
    if (l1.immediateDisqualify) {
      return this.buildResult(0, l1.siteUrl, l1.reason);
    }
    noWebsiteScore += l1.points;
    reasons.push(l1.reason);
    log.debug({ name: business.name, l1Points: l1.points, totalScore: noWebsiteScore }, "Layer 1 concluído");

    // ── Layer 2: Busca no Google por nome + cidade (peso: 20) ─────────────────
    const l2 = await this.checkLayer2(business);
    if (l2.immediateDisqualify) {
      return this.buildResult(0, l2.siteUrl, l2.reason);
    }
    noWebsiteScore += l2.points;
    reasons.push(l2.reason);
    log.debug({ name: business.name, l2Points: l2.points, totalScore: noWebsiteScore }, "Layer 2 concluído");

    // ── Layer 3: Candidatos de domínio por DNS + HTTP + CMS (peso: 30) ────────
    const inferredNiche = inferNicheFromCategory(business.category);
    const l3 = await this.checkLayer3(business, inferredNiche);
    if (l3.immediateDisqualify) {
      return this.buildResult(0, l3.siteUrl, l3.reason);
    }
    noWebsiteScore += l3.points;
    reasons.push(l3.reason);
    log.debug({ name: business.name, l3Points: l3.points, totalScore: noWebsiteScore }, "Layer 3 concluído");

    // ── Layer 4: Links externos nas redes sociais (peso: 15) ──────────────────
    const l4 = await this.checkLayer4(business);
    if (l4.immediateDisqualify) {
      return this.buildResult(0, l4.siteUrl, l4.reason);
    }
    noWebsiteScore += l4.points;
    reasons.push(l4.reason);
    log.debug({ name: business.name, l4Points: l4.points, totalScore: noWebsiteScore }, "Layer 4 concluído");

    const approved = noWebsiteScore >= NO_WEBSITE_THRESHOLD;
    log.info({ name: business.name, noWebsiteScore, approved }, "Validação probabilística concluída");

    return {
      hasOwnWebsite: !approved,
      websiteUrl: foundWebsiteUrl,
      noWebsiteScore,
      confidence: noWebsiteScore / 100,
      reason: reasons.filter(Boolean).join(" | "),
      checkedAt: new Date(),
    };
  }

  private buildResult(noWebsiteScore: number, siteUrl: string | null, reason: string): WebsiteValidationResult {
    return {
      hasOwnWebsite: noWebsiteScore < NO_WEBSITE_THRESHOLD,
      websiteUrl: siteUrl,
      noWebsiteScore,
      confidence: noWebsiteScore / 100,
      reason,
      checkedAt: new Date(),
    };
  }

  // ── Layer 1 ─────────────────────────────────────────────────────────────────

  private async checkLayer1(business: BusinessRaw): Promise<LayerResult> {
    if (!business.website) {
      return { points: 35, reason: "Sem website no Google Business", immediateDisqualify: false, siteUrl: null };
    }

    const resolved = resolveGoogleRedirect(business.website);
    const domain = extractDomain(resolved);

    if (isSocialOrDirectoryDomain(domain)) {
      return {
        points: 22,
        reason: `Website declarado é rede social/diretório: ${domain}`,
        immediateDisqualify: false,
        siteUrl: null,
      };
    }

    const active = await isUrlAccessible(resolved);
    if (!active) {
      return {
        points: 12,
        reason: `Website declarado inacessível: ${resolved}`,
        immediateDisqualify: false,
        siteUrl: null,
      };
    }

    return {
      points: 0,
      reason: `Website ativo no Google Business: ${resolved}`,
      immediateDisqualify: true,
      siteUrl: resolved,
    };
  }

  // ── Layer 2 ─────────────────────────────────────────────────────────────────

  private async checkLayer2(business: BusinessRaw): Promise<LayerResult> {
    try {
      const result = await googleSearchValidator.checkBusinessWebsite(business.name, business.city);

      if (!result.layerWorked) {
        return { points: 0, reason: "Google Search indisponível (neutro)", immediateDisqualify: false, siteUrl: null };
      }

      if (result.foundBusinessSite) {
        return {
          points: 0,
          reason: `Site encontrado via Google Search: ${result.siteUrl}`,
          immediateDisqualify: true,
          siteUrl: result.siteUrl,
        };
      }

      return { points: 20, reason: "Google Search: nenhum site próprio encontrado", immediateDisqualify: false, siteUrl: null };
    } catch {
      return { points: 0, reason: "Google Search indisponível (neutro)", immediateDisqualify: false, siteUrl: null };
    }
  }

  // ── Layer 3 ─────────────────────────────────────────────────────────────────

  private async checkLayer3(business: BusinessRaw, niche?: string): Promise<LayerResult> {
    const candidates = generateDomainCandidates(business.name, niche)
      .filter((c) => !isSocialOrDirectoryDomain(c));

    for (const candidate of candidates.slice(0, 8)) {
      await randomDelay(300, 700);

      const active = await isDomainActive(candidate);
      if (!active) continue;

      const accessible = await isUrlAccessible(candidate);
      if (!accessible) continue;

      const parked = await isParkedPage(candidate);
      if (parked) {
        log.debug({ candidate }, "Domínio candidato estacionado, ignorado");
        continue;
      }

      const hasCMS = await detectCMS(candidate);
      const detail = hasCMS ? "com CMS detectado" : "acessível";

      return {
        points: 0,
        reason: `Domínio candidato ativo (${detail}): ${candidate}`,
        immediateDisqualify: true,
        siteUrl: `https://${candidate}`,
      };
    }

    return {
      points: 30,
      reason: "Nenhum domínio candidato ativo encontrado",
      immediateDisqualify: false,
      siteUrl: null,
    };
  }

  // ── Layer 4 ─────────────────────────────────────────────────────────────────

  private async checkLayer4(business: BusinessRaw): Promise<LayerResult> {
    try {
      const result = await checkSocialBio(business.instagram, business.facebook);

      if (!result.layerWorked) {
        return { points: 0, reason: "Redes sociais inacessíveis (neutro)", immediateDisqualify: false, siteUrl: null };
      }

      if (result.hasExternalSite) {
        return {
          points: 0,
          reason: `Site externo detectado na bio social: ${result.siteUrl}`,
          immediateDisqualify: true,
          siteUrl: result.siteUrl,
        };
      }

      return { points: 15, reason: "Nenhum site externo nas redes sociais", immediateDisqualify: false, siteUrl: null };
    } catch {
      return { points: 0, reason: "Redes sociais inacessíveis (neutro)", immediateDisqualify: false, siteUrl: null };
    }
  }

  async close(): Promise<void> {
    await googleSearchValidator.close();
  }
}

export const websiteValidator = new WebsiteValidator();
