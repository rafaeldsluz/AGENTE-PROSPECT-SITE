import { createHash } from "crypto";
import { deepseekChat } from "../../utils/deepseek-client.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import { getCached, setCached, cacheTTL } from "../../utils/ai-cache.js";
import type { BusinessEnriched } from "../../types/business.types.js";
import type { TemplateData } from "../../types/template.types.js";
import { formatBrazilianPhone } from "../../utils/phone.js";

const log = createModuleLogger("ai:content-personalizer");

const NICHE_DEFAULTS: Record<string, Partial<TemplateData>> = {
  oficina: {
    primaryColor: "#1a1a2e",
    accentColor: "#f97316",
    services: [
      { icon: "🔧", name: "Revisão Completa", description: "Diagnóstico completo do seu veículo" },
      { icon: "🛞", name: "Alinhamento e Balanceamento", description: "Direção precisa e pneus conservados" },
      { icon: "🛢️", name: "Troca de Óleo", description: "Com lubrificantes de alta performance" },
      { icon: "❄️", name: "Ar Condicionado", description: "Recarga e manutenção completa" },
    ],
    differentials: ["Mais de 10 anos de experiência", "Mecânicos certificados", "Garantia nos serviços", "Orçamento sem compromisso"],
  },
  clinica: {
    primaryColor: "#0f172a",
    accentColor: "#0ea5e9",
    services: [
      { icon: "🩺", name: "Consultas Médicas", description: "Atendimento humanizado e especializado" },
      { icon: "🔬", name: "Exames Laboratoriais", description: "Resultados rápidos e precisos" },
      { icon: "💊", name: "Receitas e Laudos", description: "Documentação completa e digital" },
      { icon: "📋", name: "Acompanhamento", description: "Histórico do paciente sempre atualizado" },
    ],
    differentials: ["Profissionais especializados", "Agenda online", "Atendimento humanizado", "Ambiente acolhedor"],
  },
  restaurante: {
    primaryColor: "#1c0a00",
    accentColor: "#dc2626",
    services: [
      { icon: "🍽️", name: "Almoço Executivo", description: "Pratos especiais todos os dias" },
      { icon: "🥩", name: "Churrasco", description: "Carnes selecionadas na brasa" },
      { icon: "🚀", name: "Delivery", description: "Entrega rápida na sua região" },
      { icon: "🎉", name: "Eventos", description: "Espaço para festas e confraternizações" },
    ],
    differentials: ["Ingredientes frescos e selecionados", "Cozinha artesanal", "Delivery disponível", "Ambiente familiar"],
  },
  academia: {
    primaryColor: "#09090b",
    accentColor: "#eab308",
    services: [
      { icon: "💪", name: "Musculação", description: "Equipamentos modernos e variados" },
      { icon: "🏃", name: "Cardio", description: "Esteiras, bikes e elípticos de última geração" },
      { icon: "🧘", name: "Aulas Coletivas", description: "Yoga, pilates, dança e muito mais" },
      { icon: "📊", name: "Avaliação Física", description: "Acompanhamento personalizado de resultados" },
    ],
    differentials: ["Personal trainers disponíveis", "Estrutura completa", "Horários flexíveis", "Primeira semana grátis"],
  },
  imoveis: {
    primaryColor: "#0f2027",
    accentColor: "#10b981",
    services: [
      { icon: "🏠", name: "Compra e Venda", description: "Encontramos o imóvel ideal para você" },
      { icon: "🔑", name: "Locação", description: "Administração completa do seu imóvel" },
      { icon: "📋", name: "Avaliação Gratuita", description: "Saiba o valor real do seu imóvel" },
      { icon: "📝", name: "Assessoria Jurídica", description: "Documentação segura e completa" },
    ],
    differentials: ["Corretores certificados CRECI", "Portfólio exclusivo", "Atendimento personalizado", "Pós-venda garantido"],
  },
  estetica: {
    primaryColor: "#1a0a0a",
    accentColor: "#ec4899",
    services: [
      { icon: "✂️", name: "Corte e Escova", description: "Mãos de especialistas para o seu visual" },
      { icon: "💅", name: "Unhas", description: "Manicure, pedicure e nail art" },
      { icon: "👁️", name: "Design de Sobrancelha", description: "Emolduramos o seu olhar" },
      { icon: "✨", name: "Tratamentos Faciais", description: "Pele radiante e renovada" },
    ],
    differentials: ["Produtos premium", "Profissionais especializados", "Ambiente relaxante", "Agendamento online"],
  },
  advogado: {
    primaryColor: "#0a0e1a",
    accentColor: "#c9a84c",
    services: [
      { icon: "⚖️", name: "Direito Trabalhista", description: "Defesa de direitos em causas trabalhistas" },
      { icon: "🏛️", name: "Direito Civil", description: "Contratos, família e sucessões" },
      { icon: "🔒", name: "Direito Criminal", description: "Defesa técnica em processo penal" },
      { icon: "🏢", name: "Direito Empresarial", description: "Assessoria para empresas e contratos" },
    ],
    differentials: ["OAB regularizado", "Atendimento confidencial", "Experiência comprovada", "Consulta inicial gratuita"],
  },
};

export class ContentPersonalizer {
  async personalize(business: BusinessEnriched): Promise<TemplateData> {
    log.info({ name: business.name, niche: business.niche }, "Personalizando conteúdo");

    const defaults = NICHE_DEFAULTS[business.niche] ?? NICHE_DEFAULTS["oficina"] ?? {};

    // Consulta cache antes de chamar DeepSeek
    const cacheKey = `content:${createHash("md5").update(`${business.name}|${business.niche}|${business.city}`).digest("hex")}`;

    type AiContent = { heroHeadline: string; heroSubtitle: string; ctaText: string };
    let aiContent: AiContent | null = await getCached<AiContent>(cacheKey);

    if (!aiContent) {
      try {
        aiContent = await withRetry(
          () => this.generateAIContent(business),
          { maxAttempts: 3, baseDelayMs: 2_000, maxDelayMs: 8_000 }
        );
        await setCached(cacheKey, aiContent, cacheTTL.CONTENT);
      } catch (err) {
        log.warn({ name: business.name, error: String(err) }, "IA falhou, usando defaults");
        return this.buildWithDefaults(business, defaults);
      }
    }

    try {

      const phone = business.whatsapp ?? business.phone ?? "";
      const formatted = formatBrazilianPhone(phone);

      return {
        companyName: business.name,
        niche: business.niche,
        phone: formatted,
        whatsapp: phone.replace(/\D/g, ""),
        address: business.address,
        city: business.city,
        logoUrl: business.logoUrl,
        heroHeadline: aiContent.heroHeadline,
        heroSubtitle: aiContent.heroSubtitle,
        ctaText: aiContent.ctaText,
        services: defaults.services ?? [],
        differentials: defaults.differentials ?? [],
        testimonials: this.buildTestimonials(business),
        primaryColor: defaults.primaryColor ?? "#1a1a2e",
        accentColor: defaults.accentColor ?? "#3b82f6",
        instagram: business.instagram,
        facebook: business.facebook,
      };
    } catch (err) {
      log.warn({ name: business.name, error: String(err) }, "Montagem de template falhou, usando defaults");
      return this.buildWithDefaults(business, defaults);
    }
  }

  private async generateAIContent(business: BusinessEnriched): Promise<{
    heroHeadline: string;
    heroSubtitle: string;
    ctaText: string;
  }> {
    const reviewSummary = business.reviewCount && business.reviewCount > 0
      ? `${business.reviewCount} avaliações, média ${business.rating?.toFixed(1)}`
      : "Sem avaliações ainda";

    const text = await deepseekChat({
      max_tokens: 300,
      system: `Você cria textos de landing page para negócios locais brasileiros.
Retorne APENAS JSON com: {"heroHeadline": "...", "heroSubtitle": "...", "ctaText": "..."}
Regras: headline impactante (máx 8 palavras), subtítulo convincente (máx 20 palavras), CTA no imperativo (máx 5 palavras).
Foco em benefício para o cliente, não na empresa. Tom profissional e confiante.`,
      messages: [
        {
          role: "user",
          content: `Empresa: "${business.name}" | Nicho: ${business.niche} | Cidade: ${business.city} | ${reviewSummary}`,
        },
      ],
    });
    const parsed = JSON.parse(text) as { heroHeadline: string; heroSubtitle: string; ctaText: string };

    return {
      heroHeadline: parsed.heroHeadline ?? `Bem-vindo à ${business.name}`,
      heroSubtitle: parsed.heroSubtitle ?? "Qualidade e atendimento que você merece",
      ctaText: parsed.ctaText ?? "Fale com a Gente",
    };
  }

  private buildTestimonials(business: BusinessEnriched) {
    if (!business.reviewCount || business.reviewCount === 0) return [];

    return [
      {
        author: "Cliente satisfeito",
        rating: Math.round(business.rating ?? 5),
        text: `Ótimo atendimento! Recomendo muito a ${business.name} para todos.`,
      },
    ];
  }

  private buildWithDefaults(
    business: BusinessEnriched,
    defaults: Partial<TemplateData>
  ): TemplateData {
    const phone = business.whatsapp ?? business.phone ?? "";
    return {
      companyName: business.name,
      niche: business.niche,
      phone: formatBrazilianPhone(phone),
      whatsapp: phone.replace(/\D/g, ""),
      address: business.address,
      city: business.city,
      logoUrl: business.logoUrl,
      heroHeadline: `Bem-vindo à ${business.name}`,
      heroSubtitle: "Qualidade e compromisso em cada atendimento",
      ctaText: "Fale Conosco no WhatsApp",
      services: defaults.services ?? [],
      differentials: defaults.differentials ?? [],
      testimonials: this.buildTestimonials(business),
      primaryColor: defaults.primaryColor ?? "#1a1a2e",
      accentColor: defaults.accentColor ?? "#3b82f6",
      instagram: business.instagram,
      facebook: business.facebook,
    };
  }
}

export const contentPersonalizer = new ContentPersonalizer();
