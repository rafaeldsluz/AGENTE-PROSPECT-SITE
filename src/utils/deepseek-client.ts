import axios, { type AxiosInstance } from "axios";
import { config } from "../config/index.js";
import { createModuleLogger } from "./logger.js";

const log = createModuleLogger("deepseek");

const DEEPSEEK_API_URL = "https://api.deepseek.com";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages: Message[];
}

interface DeepSeekChoice {
  message: { content: string };
  finish_reason: string;
}

interface DeepSeekResponse {
  choices: DeepSeekChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function isDeepSeekResponse(v: unknown): v is DeepSeekResponse {
  return (
    typeof v === "object" &&
    v !== null &&
    "choices" in v &&
    Array.isArray((v as { choices: unknown }).choices) &&
    (v as DeepSeekResponse).choices.length > 0
  );
}

class DeepSeekClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: DEEPSEEK_API_URL,
      headers: {
        Authorization: `Bearer ${config.deepseek.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    });
  }

  async chat(options: ChatOptions): Promise<string> {
    const messages: Message[] = options.system
      ? [{ role: "system", content: options.system }, ...options.messages]
      : options.messages;

    const response = await this.http.post<unknown>("/chat/completions", {
      model: options.model ?? "deepseek-chat",
      max_tokens: options.max_tokens ?? 500,
      messages,
    });

    if (!isDeepSeekResponse(response.data)) {
      log.warn({ data: response.data }, "Resposta DeepSeek fora do formato esperado");
      throw new Error("Resposta da IA em formato inválido");
    }

    const content = response.data.choices[0]?.message?.content ?? "";

    if (response.data.usage) {
      log.debug(
        { prompt: response.data.usage.prompt_tokens, completion: response.data.usage.completion_tokens },
        "DeepSeek token usage"
      );
    }

    return content;
  }
}

export const deepseekClient = new DeepSeekClient();

// Backwards-compatible function export used across AI modules
export async function deepseekChat(options: ChatOptions): Promise<string> {
  return deepseekClient.chat(options);
}
