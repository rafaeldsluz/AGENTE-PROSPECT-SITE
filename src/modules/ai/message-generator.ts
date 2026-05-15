import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import type { BusinessEnriched } from "../../types/business.types.js";

const log = createModuleLogger("ai:message-generator");

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

// Templates base para variar as mensagens e evitar padrão detectável
const MESSAGE_TEMPLATES = [
  (name: string) => `Olá! Estava pesquisando negócios da região e o perfil de vocês chamou bastante atenção. Montei uma demonstração rápida de como poderia ficar uma página moderna para a *${name}*, com apresentação dos serviços, contato direto pelo WhatsApp e captação de clientes. Resolvi enviar porque achei que combinaria bastante com o perfil de vocês. Posso compartilhar?`,

  (name: string) => `Oi, tudo bem? Criei uma demonstração visual gratuita de como seria uma landing page para a *${name}*. Página moderna, com seus serviços, avaliações e botão direto pro WhatsApp de vocês. Nada cobrado, só queria mostrar o que ficou. Posso enviar?`,

  (name: string) => `Olá! Fiz uma demonstração de presença digital para a *${name}*. É uma página rápida, bonita, com os serviços de vocês e contato pelo WhatsApp. Muitos clientes hoje pesquisam no celular antes de ir pessoalmente, e isso poderia ajudar bastante. Posso te mostrar como ficou?`,
];

export class MessageGenerator {
  async generate(business: BusinessEnriched): Promise<string> {
    // 30% das vezes usa mensagem personalizada pela IA para variedade
    if (Math.random() < 0.3) {
      try {
        return await withRetry(
          () => this.generateWithAI(business),
          { maxAttempts: 2, baseDelayMs: 2_000, maxDelayMs: 6_000 }
        );
      } catch {
        log.debug({ name: business.name }, "Fallback para template fixo");
      }
    }

    // Template rotativo para evitar padrão
    const templateIndex = Math.floor(Math.random() * MESSAGE_TEMPLATES.length);
    const template = MESSAGE_TEMPLATES[templateIndex];
    if (!template) return MESSAGE_TEMPLATES[0]!(business.name);
    return template(business.name);
  }

  private async generateWithAI(business: BusinessEnriched): Promise<string> {
    log.debug({ name: business.name }, "Gerando mensagem via Claude");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: `Você é um profissional de marketing digital que aborda empresas locais com uma demonstração visual gratuita.
Regras OBRIGATÓRIAS:
- Mensagem curta (máx 3 frases)
- Tom amigável, não vendedor
- NÃO mencione preço, NÃO seja genérico, NÃO pareça spam
- Mencione o nome da empresa usando *nome* (negrito WhatsApp)
- Finalize fazendo uma pergunta para gerar resposta
- Mencione que é uma demonstração gratuita e visual
- Seja natural como alguém que realmente se interessou pela empresa`,
      messages: [
        {
          role: "user",
          content: `Empresa: "${business.name}" | Segmento: ${business.niche} | Cidade: ${business.city} | Avaliações: ${business.reviewCount ?? 0}`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (!text || text.length < 50) throw new Error("Mensagem muito curta");

    return text;
  }
}

export const messageGenerator = new MessageGenerator();
