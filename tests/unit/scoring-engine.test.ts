import { describe, it, expect } from "vitest";
import { ScoringEngine } from "../../src/modules/lead-scoring/scoring-engine.js";
import type { BusinessValidated } from "../../src/types/business.types.js";

const engine = new ScoringEngine();

function makeBusiness(overrides: Partial<BusinessValidated> = {}): BusinessValidated {
  return {
    placeId: "place123",
    name: "Oficina do João",
    category: "Oficina mecânica",
    address: "Rua Teste, 100",
    city: "São Paulo",
    phone: null,
    whatsapp: null,
    website: null,
    rating: null,
    reviewCount: null,
    photos: [],
    logoUrl: null,
    instagram: null,
    facebook: null,
    googleMapsUrl: "https://maps.google.com/place/123",
    scrapedAt: new Date(),
    validation: {
      hasOwnWebsite: false,
      websiteUrl: null,
      confidence: 0.9,
      reason: "Sem site detectado",
      checkedAt: new Date(),
    },
    ...overrides,
  };
}

describe("ScoringEngine", () => {
  describe("score returns BusinessEnriched with correct fields", () => {
    it("preserves niche and confidence", () => {
      const result = engine.score(makeBusiness(), "oficina", 1.0);
      expect(result.niche).toBe("oficina");
      expect(result.nicheConfidence).toBe(1.0);
    });

    it("score is between 0 and 100", () => {
      const result = engine.score(makeBusiness(), "oficina", 1.0);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("score is 0 when niche confidence is 0", () => {
      // The niche relevance always contributes — confidence=0 is the only way to get score=0
      const result = engine.score(makeBusiness(), "outros", 0);
      expect(result.score).toBe(0);
    });

    it("score is non-zero just from category relevance (no engagement data)", () => {
      // Even without phone/reviews/photos, categoryRelevance contributes points
      const result = engine.score(makeBusiness(), "outros", 1.0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.scoreBreakdown.categoryRelevance).toBeGreaterThan(0);
    });
  });

  describe("whatsapp scoring", () => {
    it("gives more points for whatsapp than landline only", () => {
      const withWa  = engine.score(makeBusiness({ whatsapp: "11987654321" }), "oficina", 1.0);
      const withTel = engine.score(makeBusiness({ phone: "1130001234", whatsapp: null }), "oficina", 1.0);
      expect(withWa.scoreBreakdown.hasWhatsApp).toBeGreaterThan(withTel.scoreBreakdown.hasWhatsApp);
    });

    it("gives 0 points when no phone at all", () => {
      const result = engine.score(makeBusiness(), "oficina", 1.0);
      expect(result.scoreBreakdown.hasWhatsApp).toBe(0);
    });
  });

  describe("review count scoring", () => {
    it("rewards 100+ reviews with max score", () => {
      const result = engine.score(makeBusiness({ reviewCount: 150 }), "oficina", 1.0);
      expect(result.scoreBreakdown.reviewCount).toBe(15);
    });

    it("gives 0 for no reviews", () => {
      const result = engine.score(makeBusiness({ reviewCount: null }), "oficina", 1.0);
      expect(result.scoreBreakdown.reviewCount).toBe(0);
    });
  });

  describe("niche relevance", () => {
    it("clinica has higher relevance than outros", () => {
      const clinica = engine.score(makeBusiness(), "clinica", 1.0);
      const outros  = engine.score(makeBusiness(), "outros",  1.0);
      expect(clinica.scoreBreakdown.categoryRelevance).toBeGreaterThan(
        outros.scoreBreakdown.categoryRelevance
      );
    });
  });

  describe("niche confidence scaling", () => {
    it("halved confidence produces proportionally lower score", () => {
      const full = engine.score(
        makeBusiness({ whatsapp: "11987654321", reviewCount: 50, rating: 4.5 }),
        "clinica", 1.0
      );
      const half = engine.score(
        makeBusiness({ whatsapp: "11987654321", reviewCount: 50, rating: 4.5 }),
        "clinica", 0.5
      );
      // score = Math.round(normalized * confidence)
      expect(half.score).toBeLessThan(full.score);
    });
  });

  describe("instagram and logo bonuses", () => {
    it("adds points for instagram presence", () => {
      const with_ig    = engine.score(makeBusiness({ instagram: "https://instagram.com/test" }), "estetica", 1.0);
      const without_ig = engine.score(makeBusiness(), "estetica", 1.0);
      expect(with_ig.scoreBreakdown.hasInstagram).toBe(8);
      expect(without_ig.scoreBreakdown.hasInstagram).toBe(0);
    });

    it("adds points for logo presence", () => {
      const with_logo    = engine.score(makeBusiness({ logoUrl: "https://example.com/logo.png" }), "estetica", 1.0);
      const without_logo = engine.score(makeBusiness(), "estetica", 1.0);
      expect(with_logo.scoreBreakdown.hasLogo).toBe(5);
      expect(without_logo.scoreBreakdown.hasLogo).toBe(0);
    });
  });
});
