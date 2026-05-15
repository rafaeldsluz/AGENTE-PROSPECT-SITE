import { createModuleLogger } from "../../utils/logger.js";
import type { BusinessValidated, BusinessEnriched, ScoreBreakdown, Niche } from "../../types/business.types.js";

const log = createModuleLogger("lead-scoring");

// Nichos com maior potencial de conversão (mais receptivos a presença digital)
const NICHE_RELEVANCE: Record<Niche, number> = {
  clinica: 10,
  estetica: 9,
  academia: 8,
  restaurante: 8,
  oficina: 7,
  imoveis: 7,
  loja: 6,
  servicos: 5,
  outros: 3,
};

export class ScoringEngine {
  score(business: BusinessValidated, niche: Niche, nicheConfidence: number): BusinessEnriched {
    const breakdown = this.computeBreakdown(business, niche);
    const total = this.computeTotal(breakdown, nicheConfidence);

    log.debug({ name: business.name, score: total, niche }, "Lead pontuado");

    return {
      ...business,
      niche,
      nicheConfidence,
      score: total,
      scoreBreakdown: breakdown,
    };
  }

  private computeBreakdown(business: BusinessValidated, niche: Niche): ScoreBreakdown {
    return {
      hasWhatsApp: this.scoreWhatsApp(business),
      reviewCount: this.scoreReviewCount(business.reviewCount),
      rating: this.scoreRating(business.rating),
      photoCount: this.scorePhotoCount(business.photos.length),
      hasInstagram: business.instagram ? 8 : 0,
      hasLogo: business.logoUrl ? 5 : 0,
      categoryRelevance: NICHE_RELEVANCE[niche] ?? 3,
    };
  }

  private computeTotal(breakdown: ScoreBreakdown, nicheConfidence: number): number {
    const rawTotal = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    // Normaliza para 0-100 e aplica confiança do nicho
    const normalized = Math.min(100, rawTotal * 1.5);
    return Math.round(normalized * nicheConfidence);
  }

  private scoreWhatsApp(business: BusinessValidated): number {
    if (!business.whatsapp && !business.phone) return 0;
    if (business.whatsapp) return 20; // Celular detectado
    return 10; // Apenas telefone fixo
  }

  private scoreReviewCount(reviewCount: number | null): number {
    if (!reviewCount) return 0;
    if (reviewCount >= 100) return 15;
    if (reviewCount >= 50) return 12;
    if (reviewCount >= 20) return 9;
    if (reviewCount >= 5) return 5;
    return 2;
  }

  private scoreRating(rating: number | null): number {
    if (!rating) return 0;
    if (rating >= 4.5) return 10;
    if (rating >= 4.0) return 8;
    if (rating >= 3.5) return 5;
    return 2;
  }

  private scorePhotoCount(count: number): number {
    if (count >= 5) return 8;
    if (count >= 3) return 5;
    if (count >= 1) return 2;
    return 0;
  }
}

export const scoringEngine = new ScoringEngine();
