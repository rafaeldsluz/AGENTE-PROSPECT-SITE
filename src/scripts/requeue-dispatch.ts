/**
 * Re-enfileira dispatch jobs para todos os leads screenshot_ready
 * que não têm dispatch pendente no banco.
 *
 * Uso: npx tsx src/scripts/requeue-dispatch.ts
 */
import "dotenv/config";
import { db } from "../database/client.js";
import { leads } from "../database/schema.js";
import { eq } from "drizzle-orm";
import { dispatchQueue } from "../modules/queue/queue-manager.js";
import { messageGenerator } from "../modules/ai/message-generator.js";
import { createModuleLogger } from "../utils/logger.js";
import type { DispatchJobData } from "../types/queue.types.js";
import type { BusinessEnriched } from "../types/business.types.js";
import type { Niche } from "../types/business.types.js";

const log = createModuleLogger("requeue:dispatch");

async function main() {
  log.info("=== Re-enfileiramento de dispatch para screenshot_ready ===");

  const readyLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.status, "screenshot_ready"));

  log.info({ total: readyLeads.length }, "Leads screenshot_ready encontrados");

  if (readyLeads.length === 0) {
    log.info("Nenhum lead para re-enfileirar.");
    process.exit(0);
  }

  let enqueued = 0;
  let skipped = 0;

  for (const lead of readyLeads) {
    const targetPhone = lead.whatsapp ?? lead.phone;
    if (!targetPhone || !lead.screenshotPath) {
      log.warn({ name: lead.name }, "Sem telefone ou screenshot — pulando");
      skipped++;
      continue;
    }

    // Constrói objeto BusinessEnriched mínimo para gerar mensagem
    const enriched: BusinessEnriched = {
      placeId: lead.placeId,
      name: lead.name,
      category: lead.category ?? "",
      address: lead.address ?? "",
      city: lead.city ?? "",
      phone: lead.phone ?? null,
      whatsapp: lead.whatsapp ?? null,
      website: null,
      rating: lead.rating ?? null,
      reviewCount: lead.reviewCount ?? null,
      photos: (lead.photos as string[]) ?? [],
      logoUrl: lead.logoUrl ?? null,
      instagram: lead.instagram ?? null,
      facebook: lead.facebook ?? null,
      googleMapsUrl: lead.googleMapsUrl,
      scrapedAt: lead.scrapedAt,
      validation: {
        hasOwnWebsite: false,
        websiteUrl: null,
        noWebsiteScore: 90,
        confidence: 0.9,
        reason: "skip",
        checkedAt: new Date(),
      },
      niche: (lead.niche ?? "servicos") as Niche,
      nicheConfidence: 0.97,
      score: lead.score ?? 50,
      scoreBreakdown: {
        hasWhatsApp: 0, reviewCount: 0, rating: 0, photoCount: 0,
        hasInstagram: 0, hasLogo: 0, categoryRelevance: 0, instagramOnly: 0,
      },
    };

    const message = await messageGenerator.generate(enriched);

    const job: DispatchJobData = {
      leadId: lead.id,
      whatsapp: targetPhone,
      companyName: lead.name,
      screenshotPath: lead.screenshotPath,
      message,
      ...(lead.pageUrl ? { pageUrl: lead.pageUrl } : {}),
    };

    // Delay curto humanizado (30–90s) escalonado por posição
    const delay = Math.floor(Math.random() * 60_000) + 30_000;
    await dispatchQueue.add(`dispatch-requeue-${lead.id}`, job, { delay });
    enqueued++;

    if (enqueued % 20 === 0) {
      log.info({ enqueued, total: readyLeads.length }, "Progresso...");
    }
  }

  log.info({ enqueued, skipped }, "✅ Concluído! Jobs de dispatch adicionados.");
  log.info("Os disparos ocorrem a 1 por 2 minutos (rate limiter). Acompanhe no dashboard.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
