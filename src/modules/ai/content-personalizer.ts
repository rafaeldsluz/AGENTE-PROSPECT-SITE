import { createModuleLogger } from "../../utils/logger.js";
import type { BusinessEnriched } from "../../types/business.types.js";
import type { TemplateData } from "../../types/template.types.js";
import { formatBrazilianPhone } from "../../utils/phone.js";
import { landingPageScopeAgent } from "./landing-scope-agent.js";
import { analyzeBrandColors } from "./brand-analyzer.js";

const log = createModuleLogger("ai:content-personalizer");

const NICHE_COLORS: Record<string, { primaryColor: string; accentColor: string }> = {
  advogado:   { primaryColor: "#0a0e1a", accentColor: "#c9a84c" },
  clinica:    { primaryColor: "#0f172a", accentColor: "#0ea5e9" },
  automoveis: { primaryColor: "#0d1117", accentColor: "#ef4444" },
  imoveis:    { primaryColor: "#0f2027", accentColor: "#10b981" },
  comercio:   { primaryColor: "#0f1923", accentColor: "#f59e0b" },
  servicos:   { primaryColor: "#0a1628", accentColor: "#3b82f6" },
  outros:     { primaryColor: "#111827", accentColor: "#6366f1" },
  // legados — mantidos para leads antigos no banco
  oficina:    { primaryColor: "#1a1a2e", accentColor: "#f97316" },
  estetica:   { primaryColor: "#1a0a0a", accentColor: "#ec4899" },
};

export class ContentPersonalizer {
  async personalize(business: BusinessEnriched): Promise<TemplateData> {
    log.info({ name: business.name, niche: business.niche }, "Personalizando conteúdo");

    const nicheColors = NICHE_COLORS[business.niche] ?? NICHE_COLORS["outros"]!;
    const phone = business.whatsapp ?? business.phone ?? "";

    // Tenta extrair paleta da marca real da empresa; usa padrão do nicho se falhar
    const colors = await analyzeBrandColors(
      business.logoUrl,
      business.photos,
      business.niche
    ).catch(() => ({ ...nicheColors, source: "niche_default" as const }));

    try {
      const scope = await landingPageScopeAgent.generate(business);

      return {
        companyName: business.name,
        niche: business.niche,
        phone: formatBrazilianPhone(phone),
        whatsapp: phone.replace(/\D/g, ""),
        address: business.address,
        city: business.city,
        logoUrl: business.logoUrl,
        heroHeadline: scope.heroHeadline,
        heroSubtitle: scope.heroSubtitle,
        ctaText: scope.ctaText,
        whatsappMessage: scope.whatsappMessage,
        services: scope.services,
        differentials: scope.differentials,
        testimonials: this.buildTestimonials(business),
        primaryColor: colors.primaryColor,
        accentColor: colors.accentColor,
        instagram: business.instagram,
        facebook: business.facebook,
        rating: business.rating,
        reviewCount: business.reviewCount,
      };
    } catch (err) {
      log.warn({ name: business.name, error: String(err) }, "Agente de escopo falhou, usando fallback");
      return this.buildFallback(business, phone, colors);
    }
  }

  private buildTestimonials(business: BusinessEnriched) {
    if (!business.reviewCount || business.reviewCount === 0) return [];
    return [
      {
        author: "Cliente satisfeito",
        rating: Math.round(business.rating ?? 5),
        text: `Ótimo atendimento! Recomendo muito a ${business.name}.`,
      },
    ];
  }

  private buildFallback(
    business: BusinessEnriched,
    phone: string,
    colors: { primaryColor: string; accentColor: string }
  ): TemplateData {
    return {
      companyName: business.name,
      niche: business.niche,
      phone: formatBrazilianPhone(phone),
      whatsapp: phone.replace(/\D/g, ""),
      address: business.address,
      city: business.city,
      logoUrl: business.logoUrl,
      heroHeadline: `${business.name} — Atendimento de Qualidade`,
      heroSubtitle: `Referência em ${business.city} com atendimento especializado e compromisso com você.`,
      ctaText: "Fale no WhatsApp",
      whatsappMessage: `Olá! Gostaria de mais informações sobre a ${business.name}.`,
      services: [],
      differentials: ["Atendimento personalizado", "Equipe especializada", "Qualidade garantida", "Fácil acesso"],
      testimonials: this.buildTestimonials(business),
      primaryColor: colors.primaryColor,
      accentColor: colors.accentColor,
      instagram: business.instagram,
      facebook: business.facebook,
      rating: business.rating,
      reviewCount: business.reviewCount,
    };
  }
}

export const contentPersonalizer = new ContentPersonalizer();
