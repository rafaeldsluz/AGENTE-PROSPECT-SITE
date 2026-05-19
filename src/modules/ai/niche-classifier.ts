import { createHash } from "crypto";
import { deepseekChat } from "../../utils/deepseek-client.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import { getCached, setCached, cacheTTL } from "../../utils/ai-cache.js";
import type { Niche } from "../../types/business.types.js";

const log = createModuleLogger("ai:niche-classifier");

interface ClassificationResult {
  niche: Niche;
  confidence: number;
  reasoning: string;
}

const VALID_NICHES: Niche[] = [
  "clinica", "imoveis", "servicos", "advogado", "comercio", "outros",
];

export class NicheClassifier {
  async classify(companyName: string, category: string): Promise<ClassificationResult> {
    // Classificação rápida por palavras-chave — zero custo de tokens
    const keywordResult = this.classifyByKeywords(category, companyName);
    if (keywordResult.confidence >= 0.85) {
      log.debug({ name: companyName, niche: keywordResult.niche }, "Nicho classificado por keywords");
      return keywordResult;
    }

    // Consulta cache Redis antes de chamar a IA
    const cacheKey = `niche:${createHash("md5").update(`${companyName}|${category}`).digest("hex")}`;
    const cached = await getCached<ClassificationResult>(cacheKey);
    if (cached) return cached;

    // Chama DeepSeek para classificação de casos ambíguos
    const result = await withRetry(
      () => this.classifyWithAI(companyName, category),
      { maxAttempts: 3, baseDelayMs: 2_000, maxDelayMs: 10_000 }
    );

    await setCached(cacheKey, result, cacheTTL.NICHE);
    return result;
  }

  private classifyByKeywords(category: string, name: string): ClassificationResult {
    const text = `${category} ${name}`.toLowerCase();

    const patterns: Array<{ niche: Niche; keywords: string[]; confidence: number }> = [
      {
        niche: "advogado",
        keywords: [
          "advocacia", "advogado", "escritório jurídico", "jurídico", "direito", "oab",
          "trabalhista", "previdenciário", "tributário", "criminal", "cível",
        ],
        confidence: 0.92,
      },
      {
        niche: "clinica",
        keywords: [
          "clínica", "médic", "dentist", "odontolog", "saúde", "fisiotera",
          "psicolog", "nutricion", "veterinár", "veterinário", "ortopedi",
          "cardiolog", "dermatolog", "ginecolog", "pediatr", "consultório",
          "laboratório", "fonoaudiolog", "terapia", "acupuntur",
        ],
        confidence: 0.92,
      },
      {
        niche: "imoveis",
        keywords: [
          "imobiliária", "imóveis", "corretor", "aluguel", "venda de imóv",
          "lançamento", "incorporadora", "construtora", "loteamento", "real estate",
        ],
        confidence: 0.90,
      },
      {
        niche: "servicos",
        keywords: [
          "dedetizadora", "chaveiro", "marmoraria", "desentupidora",
          "limpeza", "higienização", "manutenção", "instalação",
          "contabilidade", "contador", "contábil",
        ],
        confidence: 0.88,
      },
      {
        niche: "comercio",
        keywords: [
          "ótica", "assistência técnica", "gráfica", "uniforme", "pet shop",
          "lavanderia", "material de construção", "ferragem", "vidraçaria",
          "papelaria", "floricultura", "brindes", "presentes",
        ],
        confidence: 0.88,
      },
    ];

    for (const p of patterns) {
      if (p.keywords.some((kw) => text.includes(kw))) {
        return { niche: p.niche, confidence: p.confidence, reasoning: `Correspondência por keyword: ${p.niche}` };
      }
    }

    return { niche: "outros", confidence: 0.5, reasoning: "Nenhuma keyword específica encontrada" };
  }

  private async classifyWithAI(companyName: string, category: string): Promise<ClassificationResult> {
    log.debug({ name: companyName }, "Classificando nicho via DeepSeek");

    const text = await deepseekChat({
      max_tokens: 200,
      system: `Você é um classificador de nichos de negócios locais brasileiros.
Classifique o negócio em exatamente um dos seguintes nichos:
clinica, imoveis, servicos, advogado, comercio, outros

Responda APENAS em JSON com o formato: {"niche": "...", "confidence": 0.0-1.0, "reasoning": "..."}`,
      messages: [
        {
          role: "user",
          content: `Empresa: "${companyName}"\nCategoria do Google Maps: "${category}"`,
        },
      ],
    });

    try {
      const parsed = JSON.parse(text) as { niche: string; confidence: number; reasoning: string };
      const niche: Niche = VALID_NICHES.includes(parsed.niche as Niche)
        ? (parsed.niche as Niche)
        : "outros";

      return {
        niche,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
        reasoning: parsed.reasoning ?? "",
      };
    } catch {
      log.warn({ response: text }, "Falha ao parsear resposta de classificação");
      return { niche: "outros", confidence: 0.5, reasoning: "Erro de parse" };
    }
  }
}

export const nicheClassifier = new NicheClassifier();
