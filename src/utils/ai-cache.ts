import IORedis from "ioredis";
import { config } from "../config/index.js";
import { createModuleLogger } from "./logger.js";

const log = createModuleLogger("ai-cache");

// Lazy: conexão criada só na primeira chamada, não no import
// Evita falha em testes que não precisam de Redis
let cacheClient: IORedis | null = null;

function getClient(): IORedis {
  if (!cacheClient) {
    cacheClient = new IORedis(config.redis.url, {
      enableReadyCheck: false,
      lazyConnect: true,
    });
    cacheClient.on("error", (err) =>
      log.debug({ error: String(err) }, "Redis cache connection error")
    );
  }
  return cacheClient;
}

export const cacheTTL = {
  NICHE: 30 * 24 * 3600,   // 30 dias — classificação de nicho é estável
  CONTENT: 7 * 24 * 3600,  // 7 dias — conteúdo pode variar um pouco
} as const;

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const val = await getClient().get(key);
    if (val) {
      log.debug({ key }, "Cache hit");
      return JSON.parse(val) as T;
    }
  } catch (err) {
    log.debug({ key, error: String(err) }, "Cache get failed");
  }
  return null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    log.debug({ key, error: String(err) }, "Cache set failed");
  }
}

export async function closeCacheClient(): Promise<void> {
  await cacheClient?.quit().catch(() => {});
}
