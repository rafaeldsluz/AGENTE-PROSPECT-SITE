import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { randomDelay, sleep } from "../../utils/delay.js";
import { evolutionClient } from "./evolution-client.js";
import { dispatchRepository } from "../../database/repositories/dispatch.repository.js";
import { leadRepository } from "../../database/repositories/lead.repository.js";

const log = createModuleLogger("whatsapp:dispatcher");

export interface DispatchPayload {
  leadId: string;
  phone: string;
  message: string;
  screenshotPath: string;
  companyName: string;
}

export class WhatsAppDispatcher {
  async dispatch(payload: DispatchPayload): Promise<boolean> {
    const { leadId, phone, message, screenshotPath, companyName } = payload;

    // Verifica rate limit
    const dispatchedInLastHour = await dispatchRepository.countDispatchedInLastHour();
    if (dispatchedInLastHour >= config.whatsapp.maxPerHour) {
      log.warn({ dispatchedInLastHour, max: config.whatsapp.maxPerHour }, "Rate limit atingido, aguardando");
      return false;
    }

    // Verifica se já enviou para este lead
    const alreadySent = await dispatchRepository.hasDispatchedToLead(leadId);
    if (alreadySent) {
      log.warn({ leadId }, "Lead já recebeu mensagem, pulando");
      return false;
    }

    // Verifica conexão
    const isConnected = await evolutionClient.checkConnection();
    if (!isConnected) {
      log.error("Evolution API não está conectada");
      await dispatchRepository.create({
        leadId,
        whatsapp: phone,
        message,
        screenshotPath,
        status: "failed",
        errorMessage: "WhatsApp desconectado — verifique a conexão na Evolution API",
      });
      throw new Error("WhatsApp desconectado");
    }

    let textMessageId: string | null = null;
    let imageMessageId: string | null = null;

    try {
      log.info({ company: companyName, phone }, "Iniciando disparo");

      // Envia texto primeiro
      textMessageId = await evolutionClient.sendText(phone, message);

      // Delay humanizado entre mensagens (3-8 segundos)
      await randomDelay(3_000, 8_000);

      // Envia screenshot como imagem
      const imageCaption = `Essa é a demonstração visual que montei para a *${companyName}*. Uma landing page moderna, com seus serviços e WhatsApp integrado. O que achou?`;
      imageMessageId = await evolutionClient.sendImage(phone, screenshotPath, imageCaption);

      // Registra no banco
      await dispatchRepository.create({
        leadId,
        whatsapp: phone,
        message,
        screenshotPath,
        evolutionMessageId: textMessageId,
        status: "sent",
      });

      await leadRepository.markDispatched(leadId);
      log.info({ company: companyName, textId: textMessageId, imageId: imageMessageId }, "Disparo concluído");

      return true;
    } catch (err) {
      log.error({ company: companyName, error: String(err) }, "Erro no disparo");

      // Registra falha
      await dispatchRepository.create({
        leadId,
        whatsapp: phone,
        message,
        screenshotPath,
        evolutionMessageId: textMessageId ?? undefined,
        status: "failed",
        errorMessage: String(err),
      });

      throw err;
    }
  }

  async waitForNextSlot(): Promise<void> {
    const { minDelayMs, maxDelayMs } = config.whatsapp;
    const delay = Math.floor(Math.random() * (maxDelayMs - minDelayMs)) + minDelayMs;
    log.info({ delaySeconds: Math.round(delay / 1000) }, "Aguardando antes do próximo disparo");
    await sleep(delay);
  }
}

export const whatsappDispatcher = new WhatsAppDispatcher();
