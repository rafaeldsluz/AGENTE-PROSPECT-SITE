/**
 * Re-enfileira leads screenshot_ready que perderam o job de dispatch no Redis.
 * Reconstrói mensagem via IA e adiciona ao dispatchQueue.
 */
import "dotenv/config";
import { db } from "../database/client.js";
import { sql } from "drizzle-orm";
import { dispatchQueue } from "../modules/queue/queue-manager.js";
import { messageGenerator } from "../modules/ai/message-generator.js";
import { createModuleLogger } from "../utils/logger.js";
import { promises as fs } from "fs";
import type { BusinessEnriched } from "../types/business.types.js";

const log = createModuleLogger("requeue-dispatch-ready");

async function main() {
  const pending = await db.execute(sql`
    SELECT l.* FROM leads l
    WHERE l.status = 'screenshot_ready'
      AND l.niche IN ('clinica', 'advogado', 'automoveis', 'imoveis')
      AND NOT EXISTS (SELECT 1 FROM dispatches d WHERE d.lead_id = l.id)
      AND l.screenshot_path IS NOT NULL
      AND (l.whatsapp IS NOT NULL OR l.phone IS NOT NULL)
    LIMIT 500
  `);

  const rows = pending.rows as any[];
  log.info({ total: rows.length }, "Leads prontos para re-dispatch");

  let enqueued = 0;
  let skipped = 0;

  for (const lead of rows) {
    // Verifica se o screenshot ainda existe no disco
    try {
      await fs.access(lead.screenshot_path);
    } catch {
      log.warn({ name: lead.name }, "Screenshot não encontrado no disco, pulando");
      skipped++;
      continue;
    }

    const phone = lead.whatsapp ?? lead.phone;

    // Reconstrói BusinessEnriched mínimo para geração de mensagem
    const enriched: BusinessEnriched = {
      placeId: lead.place_id,
      name: lead.name,
      category: lead.category ?? "",
      address: lead.address ?? "",
      city: lead.city ?? "",
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      website: null,
      rating: lead.rating,
      reviewCount: lead.review_count,
      photos: (lead.photos as string[]) ?? [],
      logoUrl: lead.logo_url,
      instagram: lead.instagram,
      facebook: lead.facebook,
      googleMapsUrl: lead.google_maps_url ?? "",
      scrapedAt: lead.scraped_at,
      validation: { hasOwnWebsite: false, noWebsiteScore: 90, confidence: 0.9, reason: "re-dispatch", checkedAt: new Date(), websiteUrl: null },
      niche: lead.niche,
      nicheConfidence: lead.niche_confidence ?? 0.9,
      score: lead.score ?? 50,
      scoreBreakdown: (lead.score_breakdown as any) ?? {},
    };

    try {
      const message = await messageGenerator.generate(enriched);

      await dispatchQueue.add(`dispatch-requeue-${lead.id}`, {
        leadId: lead.id,
        whatsapp: phone,
        companyName: lead.name,
        screenshotPath: lead.screenshot_path,
        message,
      });

      enqueued++;
      if (enqueued % 50 === 0) log.info({ enqueued, remaining: rows.length - enqueued - skipped }, "Progresso...");
    } catch (err) {
      log.error({ name: lead.name, error: String(err) }, "Erro ao gerar mensagem");
      skipped++;
    }
  }

  log.info({ enqueued, skipped }, "Re-enfileiramento concluído");
  process.exit(0);
}

void main();
