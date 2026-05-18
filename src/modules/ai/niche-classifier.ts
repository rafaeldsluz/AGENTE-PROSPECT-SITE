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
  "oficina", "clinica", "restaurante", "academia",
  "imoveis", "estetica", "loja", "servicos", "advogado", "outros",
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
          "defesa criminal", "trabalhista", "previdenciário", "tributário", "família",
          "criminal", "cível", "consultório jurídic", "dr. ", "dra. ",
        ],
        confidence: 0.92,
      },
      {
        niche: "oficina",
        keywords: [
          "oficina", "mecânic", "auto center", "auto eletric", "pneu", "borracharia",
          "funilaria", "pintura automotiv", "veículo", "motor", "freio", "alinhamento",
          "suspensão", "radiador", "cambio", "câmbio", "injeção eletrônica", "retífica",
          "carro", "moto", "motos ", "moto ", "motocicleta", "guincho",
        ],
        confidence: 0.92,
      },
      {
        niche: "clinica",
        keywords: [
          "clínica", "médic", "dentist", "odontolog", "saúde", "fisiotera",
          "psicolog", "nutricion", "veterinár", "veterinário", "vet ", "bicho",
          "pet ", "ortopedi", "cardiolog", "dermatolog", "ginecolog", "pediatr",
          "consultório", "laboratório", "exame", "raio-x", "fonoaudiolog", "terapia",
          "quiroprat", "acupuntur", "homeopat", "enfermag",
        ],
        confidence: 0.92,
      },
      {
        niche: "restaurante",
        keywords: [
          "restaurante", "lanchonete", "pizz", "hamburguer", "burger", "sushi",
          "comida", "food", "café ", "cafeteria", "bistrô", "bistro", "churrasco",
          "marmit", "delivery", "self service", "buffet", "padaria", "confeitaria",
          "sorveteria", "açaí", "tapioca", "crepe", "temaki", "yakisoba", "hotdog",
          "pastel", "frango", "steakhouse", "espetinho", "boteco", "choperia",
        ],
        confidence: 0.90,
      },
      {
        niche: "academia",
        keywords: [
          "academia", "gym", "crossfit", "muscula", "pilates", "yoga",
          "funcional", "fitness", "box ", "muay thai", "jiu jitsu", "jiu-jitsu",
          "judô", "karatê", "capoeira", "boxe", "natação", "spinning", "zumba",
          "studio ", "estúdio ", "treino", "personal trainer", "hiit",
        ],
        confidence: 0.90,
      },
      {
        niche: "imoveis",
        keywords: [
          "imobiliária", "imóveis", "corretor", "aluguel", "venda de imóv",
          "apartamento", "lançamento", "incorporadora", "construtora", "loteamento",
          "terreno", "casa ", "real estate", "imóvel",
        ],
        confidence: 0.90,
      },
      {
        niche: "estetica",
        keywords: [
          "salão", "barbearia", "beleza", "estética", "nail", "cabeleireir",
          "sobrancelha", "depilação", "micropigmentação", "spa ", "spa,",
          "designer de sobrancelha", "cilios", "cílios", "manicure", "pedicure",
          "escova", "progressiva", "botox capilar", "hidratação capilar",
          "maquiagem", "make ", "visagist", "bronzeamento", "laser", "limpeza de pele",
          "buço", "estético", "esteticista", "massagem",
        ],
        confidence: 0.90,
      },
      {
        niche: "loja",
        keywords: [
          "loja", "pet shop", "boutique", "roupas", "calçados", "sapatos",
          "móveis", "farmácia", "mercado", "supermercado", "armarinho",
          "papelaria", "livraria", "ótica", "bijuteria", "jóias", "joalheria",
          "eletrônicos", "informática", "celular", "material de construção",
          "tintas", "vidraçaria", "floricultura", "presentes", "utilidades",
        ],
        confidence: 0.85,
      },
      {
        niche: "servicos",
        keywords: [
          "dedetizadora", "chaveiro", "encanador", "eletricista", "pintora",
          "reforma", "construção", "gesseiro", "marceneiro", "marmoraria",
          "desentupidora", "limpeza", "higienização", "lavanderia", "costureira",
          "alfaiate", "conserto", "reparo", "manutenção", "instalação",
          "segurança", "alarme", "câmera", "cftv", "elétric", "hidráulic",
          "jardineiro", "jardinagem", "paisagismo", "mudança", "transporte",
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
oficina, clinica, restaurante, academia, imoveis, estetica, loja, servicos, outros

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
