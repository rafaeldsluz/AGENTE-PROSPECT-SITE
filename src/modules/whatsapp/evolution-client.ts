import axios, { type AxiosInstance } from "axios";
import https from "https";
import { promises as fs } from "fs";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import { toWhatsAppJid, normalizePhone } from "../../utils/phone.js";

const log = createModuleLogger("whatsapp:evolution");

interface SendTextPayload {
  number: string;
  text: string;
  delay?: number;
}

interface SendMediaPayload {
  number: string;
  mediatype: "image" | "document" | "audio" | "video";
  mimetype: string;
  caption?: string;
  media: string;  // base64 ou URL
  fileName?: string;
}

interface ConnectionState {
  instance: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
}

export class EvolutionApiClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.evolution.url,
      headers: {
        "apikey": config.evolution.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
      // Certificado autoassinado no nip.io local — rejeição causava falha silenciosa
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.http.get<ConnectionState>(
        `/instance/connectionState/${config.evolution.instance}`
      );
      const isOpen = response.data.instance.state === "open";
      log.info({ state: response.data.instance.state }, "Status da conexão WhatsApp");
      return isOpen;
    } catch (err) {
      log.error({ error: String(err) }, "Erro ao verificar conexão Evolution API");
      return false;
    }
  }

  async sendText(phone: string, message: string): Promise<string> {
    const raw = normalizePhone(phone);
    const number = raw.startsWith("55") ? raw : `55${raw}`;

    return withRetry(
      async () => {
        const payload: SendTextPayload = {
          number,
          text: message,
          delay: Math.floor(Math.random() * 2000) + 1000, // Simula digitação humana
        };

        const response = await this.http.post<{ key: { id: string } }>(
          `/message/sendText/${config.evolution.instance}`,
          payload
        );

        const messageId = response.data?.key?.id ?? "unknown";
        log.info({ number, messageId }, "Texto enviado com sucesso");
        return messageId;
      },
      {
        maxAttempts: 3, baseDelayMs: 5_000, maxDelayMs: 30_000,
        // 400 = número sem WhatsApp — erro permanente, retry não resolve
        shouldRetry: (err) => (err as any)?.response?.status !== 400,
      }
    );
  }

  async sendImage(phone: string, imagePath: string, caption?: string): Promise<string> {
    const raw = normalizePhone(phone);
    const number = raw.startsWith("55") ? raw : `55${raw}`;

    // Converte imagem para base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    return withRetry(
      async () => {
        const payload: SendMediaPayload = {
          number,
          mediatype: "image",
          mimetype: "image/jpeg",
          media: base64Image,
          caption: caption ?? "",
        };

        const response = await this.http.post<{ key: { id: string } }>(
          `/message/sendMedia/${config.evolution.instance}`,
          payload
        );

        const messageId = response.data?.key?.id ?? "unknown";
        log.info({ number, messageId }, "Imagem enviada com sucesso");
        return messageId;
      },
      {
        maxAttempts: 3, baseDelayMs: 5_000, maxDelayMs: 30_000,
        shouldRetry: (err) => (err as any)?.response?.status !== 400,
      }
    );
  }

  async checkNumberExists(phone: string): Promise<boolean> {
    try {
      const number = normalizePhone(phone);
      const jid = toWhatsAppJid(number);

      const response = await this.http.post<Array<{ exists: boolean; jid: string; number: string }>>(
        `/chat/whatsappNumbers/${config.evolution.instance}`,
        { numbers: [jid] }
      );

      return response.data?.[0]?.exists ?? false;
    } catch {
      // Se não conseguir verificar, assume que existe para não bloquear o fluxo
      return true;
    }
  }
}

export const evolutionClient = new EvolutionApiClient();
