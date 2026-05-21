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

/** Nichos ativos no pipeline. "servicos" e "outros" são disqualificados no pipeline.worker. */
const VALID_NICHES: Niche[] = [
  "clinica", "imoveis", "servicos", "advogado", "comercio", "automoveis", "outros",
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
        confidence: 0.93,
      },
      {
        niche: "automoveis",
        keywords: [
          "concessionária", "concessionaria", "automóveis", "automoveis",
          "veículos", "veiculos", "multimarcas", "seminovos", "usados",
          "carros", "motos", "caminhões", "caminhoes",
          "fiat", "chevrolet", "volkswagen", "toyota", "honda", "ford",
          "hyundai", "renault", "nissan", "jeep", "dodge", "bmw",
          "mercedes", "audi", "volvo", "peugeot", "citroën", "mitsubishi",
          "kia", "ram", "chery",
          "oficina mecânica", "oficina", "mecânica automotiva", "mecânica",
          "funilaria", "funileiro", "pintura automotiva",
          "auto center", "autocenter", "autopeças", "auto peças",
          "borracharia", "alinhamento", "balanceamento",
          "estética automotiva", "higienização veicular", "lavagem automotiva",
          "test drive", "financiamento de veículos", "revisão de veículos",
        ],
        confidence: 0.93,
      },
      {
        niche: "imoveis",
        keywords: [
          "imobiliária", "imóveis", "corretor", "aluguel", "venda de imóv",
          "lançamento", "incorporadora", "construtora", "loteamento", "real estate",
        ],
        confidence: 0.91,
      },
      {
        niche: "clinica",
        keywords: [
          "clínica", "médic", "dentist", "odontolog", "saúde", "fisiotera",
          "psicolog", "nutricion", "veterinár", "veterinário", "ortopedi",
          "cardiolog", "dermatolog", "ginecolog", "pediatr", "consultório",
          "laboratório", "fonoaudiolog", "terapia", "acupuntur",
          "estética", "esteticista", "spa", "depilação", "micropigmentação",
          "sobrancelha", "beleza clínica", "skincare", "botox", "preenchimento",
        ],
        confidence: 0.92,
      },
      {
        niche: "comercio",
        keywords: [
          "ótica", "assistência técnica", "gráfica", "uniforme", "pet shop",
          "lavanderia", "material de construção", "ferragem", "vidraçaria",
          "papelaria", "floricultura", "brindes", "presentes",
          "academia", "personal trainer", "pilates", "crossfit",
          "restaurante", "lanchonete", "padaria", "pizzaria",
        ],
        confidence: 0.86,
      },
      {
        niche: "servicos",
        keywords: [
          "dedetizadora", "chaveiro", "marmoraria", "desentupidora",
          "limpeza", "higienização", "manutenção", "instalação",
          "contabilidade", "contador", "contábil",
        ],
        confidence: 0.85,
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
- advogado: escritórios de advocacia, jurídico, OAB
- automoveis: concessionárias, multimarcas, oficinas, mecânicas, funilarias, auto center, estética automotiva, autopeças, borracharia
- imoveis: imobiliárias, corretores, construtoras, loteamentos
- clinica: clínicas médicas, dentistas, psicólogos, fisioterapeutas, veterinários, estética, spa, depilação
- comercio: comércios locais, lojas, academias, restaurantes, padarias, pet shops
- servicos: serviços técnicos, dedetizadoras, chaveiros, limpeza, contabilidade
- outros: não se enquadra nos nichos acima

Responda APENAS em JSON com o formato: {"niche": "...", "confidence": 0.0-1.0, "reasoning": "..."}`,
      messages: [
        {
          role: "user",
          content: `Empresa: "${companyName}"\nCategoria do Google Maps: "${category}"`,
        },
      ],
    });

    try {
      const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(jsonText) as { niche: string; confidence: number; reasoning: string };
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
