import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  DEEPSEEK_API_KEY: z.string().min(1),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  TARGET_CITIES: z.string().default("São Paulo"),
  TARGET_NICHES: z.string().default(""),
  WHATSAPP_MIN_DELAY_MS: z.coerce.number().default(120_000),
  WHATSAPP_MAX_DELAY_MS: z.coerce.number().default(600_000),
  WHATSAPP_MAX_PER_HOUR: z.coerce.number().default(8),
  SCRAPE_MAX_LEADS_PER_RUN: z.coerce.number().default(50),
  LEAD_MIN_SCORE: z.coerce.number().int().min(0).max(100).default(35),
  OUTPUT_DIR: z.string().default("./output"),
  SCREENSHOTS_DIR: z.string().default("./output/screenshots"),
  PAGES_DIR: z.string().default("./output/pages"),
  DASHBOARD_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_USER: z.string().min(1).default("admin"),
  DASHBOARD_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Configuração inválida:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  db: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  deepseek: {
    apiKey: env.DEEPSEEK_API_KEY,
  },
  evolution: {
    url: env.EVOLUTION_API_URL,
    apiKey: env.EVOLUTION_API_KEY,
    instance: env.EVOLUTION_INSTANCE,
  },
  scraping: {
    targetCities: env.TARGET_CITIES.split(",").map((c) => c.trim()).filter(Boolean),
    targetNiches: env.TARGET_NICHES
      ? env.TARGET_NICHES.split(",").map((n) => n.trim()).filter(Boolean)
      : [],
    maxLeadsPerRun: env.SCRAPE_MAX_LEADS_PER_RUN,
    minScore: env.LEAD_MIN_SCORE,
  },
  whatsapp: {
    minDelayMs: env.WHATSAPP_MIN_DELAY_MS,
    maxDelayMs: env.WHATSAPP_MAX_DELAY_MS,
    maxPerHour: env.WHATSAPP_MAX_PER_HOUR,
  },
  paths: {
    output: env.OUTPUT_DIR,
    screenshots: env.SCREENSHOTS_DIR,
    pages: env.PAGES_DIR,
  },
  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL,
    enabled: !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_PUBLIC_URL),
  },
  app: {
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    isDev: env.NODE_ENV === "development",
    dashboardPort: env.DASHBOARD_PORT,
    dashboardUser: env.DASHBOARD_USER,
    dashboardPassword: env.DASHBOARD_PASSWORD,
  },
} as const;
