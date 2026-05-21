import { createModuleLogger } from "../../utils/logger.js";
import { messageTemplateRepository } from "../../database/repositories/message-template.repository.js";
import type { BusinessEnriched } from "../../types/business.types.js";

const log = createModuleLogger("ai:message-generator");

const DEFAULT_MESSAGE = (name: string) =>
  `Olá! Montei uma demonstração gratuita de como ficaria uma página moderna para a *${name}*, com seus serviços, avaliações do Google e botão direto pro WhatsApp. Posso te mostrar como ficou?`;

export class MessageGenerator {
  async generate(business: BusinessEnriched): Promise<string> {
    // Dashboard template takes priority (per-niche or global)
    try {
      const userTemplate = await messageTemplateRepository.getForNiche(business.niche);
      if (userTemplate) {
        log.debug({ name: business.name, niche: business.niche }, "Usando template do dashboard");
        return this.interpolate(userTemplate, business);
      }
    } catch {
      // DB unavailable — use default
    }

    return DEFAULT_MESSAGE(business.name);
  }

  private interpolate(template: string, business: BusinessEnriched): string {
    return template
      .replace(/\{nome_empresa\}/g, business.name)
      .replace(/\{cidade\}/g, business.city)
      .replace(/\{telefone\}/g, business.phone ?? business.whatsapp ?? "")
      .replace(/\{whatsapp\}/g, business.whatsapp ?? business.phone ?? "")
      .replace(/\{promoção\}/g, "");
  }
}

export const messageGenerator = new MessageGenerator();
