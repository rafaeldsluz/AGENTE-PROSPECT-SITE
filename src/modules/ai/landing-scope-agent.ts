import { createHash } from "crypto";
import { deepseekChat } from "../../utils/deepseek-client.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import { getCached, setCached, cacheTTL } from "../../utils/ai-cache.js";
import type { BusinessEnriched } from "../../types/business.types.js";
import type { ServiceItem } from "../../types/template.types.js";

const log = createModuleLogger("ai:landing-scope-agent");

const NICHE_LABELS: Record<string, string> = {
  clinica: "Clínica / Consultório de Saúde",
  imoveis: "Imobiliária / Corretagem de Imóveis",
  servicos: "Prestação de Serviços",
  advogado: "Escritório de Advocacia",
  outros: "Empresa Local",
};

const NICHE_TONE: Record<string, string> = {
  clinica: "acolhedor e profissional, foco em cuidado e bem-estar",
  imoveis: "seguro e aspiracional, foco em realização e patrimônio",
  servicos: "competente e ágil, foco em solução e praticidade",
  advogado: "sério e confiável, foco em defesa e tranquilidade",
  outros: "profissional e próximo, foco em atendimento e resultado",
};

export interface LandingPageScope {
  heroHeadline: string;
  heroSubtitle: string;
  ctaText: string;
  whatsappMessage: string;
  services: ServiceItem[];
  differentials: string[];
}

export class LandingPageScopeAgent {
  async generate(business: BusinessEnriched): Promise<LandingPageScope> {
    const cacheKey = `scope_v2:${createHash("md5")
      .update(`${business.name}|${business.niche}|${business.address}|${business.city}`)
      .digest("hex")}`;

    const cached = await getCached<LandingPageScope>(cacheKey);
    if (cached) {
      log.debug({ name: business.name }, "Escopo obtido do cache");
      return cached;
    }

    log.info({ name: business.name, niche: business.niche }, "Gerando escopo completo da landing page");

    const scope = await withRetry(() => this.callAI(business), {
      maxAttempts: 3,
      baseDelayMs: 2_000,
      maxDelayMs: 10_000,
    });

    await setCached(cacheKey, scope, cacheTTL.CONTENT);
    return scope;
  }

  private async callAI(business: BusinessEnriched): Promise<LandingPageScope> {
    const nicheLabel = NICHE_LABELS[business.niche] ?? "Empresa Local";
    const tone = NICHE_TONE[business.niche] ?? "profissional e próximo";
    const reviewContext =
      business.reviewCount && business.reviewCount > 0
        ? `${business.reviewCount} avaliações com nota ${business.rating?.toFixed(1)}/5.0 no Google`
        : "ainda sem avaliações no Google";

    const businessContext = [
      `Nome da empresa: "${business.name}"`,
      `Segmento: ${nicheLabel}`,
      `Endereço: ${business.address}`,
      `Cidade: ${business.city}`,
      `Avaliações: ${reviewContext}`,
    ].join("\n");

    const text = await deepseekChat({
      max_tokens: 900,
      system: `Você é um especialista em marketing digital para pequenos negócios brasileiros.
Crie um escopo COMPLETO e PERSONALIZADO para a landing page desta empresa.
Tom desejado: ${tone}.

Retorne APENAS JSON válido com esta estrutura exata (sem markdown, sem comentários):
{
  "heroHeadline": "frase impactante, até 8 palavras, foco no benefício do cliente",
  "heroSubtitle": "frase convincente, até 25 palavras, mencione a cidade ou bairro quando ajudar",
  "ctaText": "chamada para ação, até 5 palavras, imperativo",
  "whatsappMessage": "mensagem natural pré-preenchida do WhatsApp, 1 frase curta e direta",
  "services": [
    { "icon": "emoji relevante", "name": "Nome do Serviço", "description": "benefício claro em 8 a 12 palavras" },
    { "icon": "emoji relevante", "name": "Nome do Serviço", "description": "benefício claro em 8 a 12 palavras" },
    { "icon": "emoji relevante", "name": "Nome do Serviço", "description": "benefício claro em 8 a 12 palavras" },
    { "icon": "emoji relevante", "name": "Nome do Serviço", "description": "benefício claro em 8 a 12 palavras" }
  ],
  "differentials": [
    "diferencial concreto e específico para este segmento",
    "diferencial concreto e específico para este segmento",
    "diferencial concreto e específico para este segmento",
    "diferencial concreto e específico para este segmento"
  ]
}

REGRAS CRÍTICAS:
- Use o nome real da empresa no heroHeadline ou heroSubtitle quando fizer sentido natural
- Serviços e diferenciais devem ser ESPECÍFICOS ao segmento, jamais genéricos
- Cada serviço deve ter emoji diferente e relevante
- O whatsappMessage deve soar como um cliente real escrevendo, não como marketing
- Adapte o vocabulário ao público-alvo do segmento`,
      messages: [{ role: "user", content: businessContext }],
    });

    const parsed = JSON.parse(text) as LandingPageScope;

    if (
      !parsed.heroHeadline ||
      !Array.isArray(parsed.services) ||
      parsed.services.length < 2
    ) {
      throw new Error("Estrutura do escopo inválida — resposta incompleta da IA");
    }

    return {
      heroHeadline: parsed.heroHeadline,
      heroSubtitle: parsed.heroSubtitle ?? "Atendimento especializado para você e sua família",
      ctaText: parsed.ctaText ?? "Fale Conosco",
      whatsappMessage:
        parsed.whatsappMessage ?? `Olá! Gostaria de mais informações sobre a ${business.name}.`,
      services: (parsed.services as ServiceItem[]).slice(0, 4),
      differentials: (parsed.differentials as string[]).slice(0, 4),
    };
  }
}

export const landingPageScopeAgent = new LandingPageScopeAgent();
