import axios from "axios";
import { config } from "../config/index.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages: Message[];
}

export async function deepseekChat(options: ChatOptions): Promise<string> {
  const messages: Message[] = options.system
    ? [{ role: "system", content: options.system }, ...options.messages]
    : options.messages;

  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: options.model ?? "deepseek-chat",
      max_tokens: options.max_tokens ?? 500,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${config.deepseek.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  return (response.data as { choices: Array<{ message: { content: string } }> })
    .choices[0]?.message?.content ?? "";
}
