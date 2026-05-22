/**
 * Enfileira no pipeline todos os leads scored sem screenshot.
 */
import "dotenv/config";
import { db } from "../database/client.js";
import { leads } from "../database/schema.js";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { pipelineQueue } from "../modules/queue/queue-manager.js";
import { createModuleLogger } from "../utils/logger.js";

const log = createModuleLogger("requeue:scored");

async function main() {
  const pending = await db
    .select({ id: leads.id, placeId: leads.placeId, niche: leads.niche })
    .from(leads)
    .where(
      and(
        eq(leads.status, "scored"),
        isNull(leads.screenshotPath),
        isNotNull(leads.whatsapp)
      )
    );

  log.info({ total: pending.length }, "Leads scored sem screenshot");

  for (const lead of pending) {
    await pipelineQueue.add(
      `rerender-premium-${lead.id}`,
      { leadId: lead.id, placeId: lead.placeId, ...(lead.niche ? { sourceNiche: lead.niche } : {}) },
      { priority: 10 }
    );
  }

  log.info({ enqueued: pending.length }, "✅ Jobs adicionados ao pipeline");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
