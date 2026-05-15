import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import type { Niche } from "../../types/business.types.js";

const log = createModuleLogger("ai:niche-classifier");

interface ClassificationResult {
  niche: Niche;
  confidence: number;
  reasoning: string;
}

const VALID_NICHES: Niche[] = [
  "oficina", "clinica", "restaurante", "academia",
  "imoveis", "estetica", "loja", "servicos", "outros",
];

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export class NicheClassifier {
  async classify(companyName: string, category: string): Promise<ClassificationResult> {
    // Classificação rápida por palavras-chave antes de chamar a IA
    const keywordResult = this.classifyByKeywords(category, companyName);
    if (keywordResult.confidence >= 0.85) {
      log.debug({ name: companyName, niche: keywordResult.niche }, "Nicho classificado por keywords");
      return keywordResult;
    }

    // Chama Claude para classificação mais precisa
    return withRetry(
      () => this.classifyWithAI(companyName, category),
      { maxAttempts: 3, baseDelayMs: 2_000, maxDelayMs: 10_000 }
    );
  }

  private classifyByKeywords(category: string, name: string): ClassificationResult {
    const text = `${category} ${name}`.toLowerCase();

    const patterns: Array<{ niche: Niche; keywords: string[]; confidence: number }> = [
      {
        niche: "oficina",
        keywords: ["oficina", "mecânic", "auto", "pneu", "carro", "veículo", "motor", "freio", "alinhamento"],
        confidence: 0.92,
      },
      {
        niche: "clinica",
        keywords: ["clínica", "médic", "dentist", "odontolog", "saúde", "fisiotera", "psicolog", "nutricion"],
        confidence: 0.92,
      },
      {
        niche: "restaurante",
        keywords: ["restaurante", "lanchonete", "pizz", "hamburguer", "sushi", "comida", "food", "café", "bar ", "churrasco"],
        confidence: 0.90,
      },
      {
        niche: "academia",
        keywords: ["academia", "gym", "crossfit", "muscula", "pilates", "yoga", "funcional", "fitness"],
        confidence: 0.90,
      },
      {
        niche: "imoveis",
        keywords: ["imobiliária", "imóveis", "corretor", "aluguel", "venda de imóv"],
        confidence: 0.90,
      },
      {
        niche: "estetica",
        keywords: ["salão", "barbearia", "beleza", "estética", "nail", "cabeleireir", "sobrancelha", "depilação"],
        confidence: 0.90,
      },
      {
        niche: "loja",
        keywords: ["loja", "pet shop", "boutique", "roupas", "calçados", "móveis", "farmácia", "mercado"],
        confidence: 0.85,
      },
      {
        niche: "servicos",
        keywords: ["dedetizadora", "chaveiro", "encanador", "eletricista", "pintora", "reforma", "construção"],
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
    log.debug({ name: companyName }, "Classificando nicho via Claude");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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

    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";

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
