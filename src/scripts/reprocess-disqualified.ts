/**
 * Reprocessa leads descartados por falso positivo do validador.
 *
 * Uso:
 *   tsx src/scripts/reprocess-disqualified.ts            # apenas falsos positivos do Google
 *   tsx src/scripts/reprocess-disqualified.ts --all      # todos os disqualified
 */

import "dotenv/config";
import { eq, and, like, sql } from "drizzle-orm";
import { db, closeConnection } from "../database/client.js";
import { leads } from "../database/schema.js";
import { pipelineQueue, redisConnection } from "../modules/queue/queue-manager.js";

const ALL_MODE = process.argv.includes("--all");

async function main() {
  console.log(`\n=== REPROCESSAMENTO DE LEADS DESCARTADOS ===`);
  console.log(`Modo: ${ALL_MODE ? "todos os disqualified" : "apenas falsos positivos (Google search)"}\n`);

  // Busca leads descartados
  const condition = ALL_MODE
    ? eq(leads.status, "disqualified")
    : and(
        eq(leads.status, "disqualified"),
        like(leads.validationReason, "%encontrado via Google%")
      );

  const disqualified = await db.select({
    id: leads.id,
    name: leads.name,
    city: leads.city,
    validationReason: leads.validationReason,
    websiteUrl: leads.websiteUrl,
  })
    .from(leads)
    .where(condition);

  if (disqualified.length === 0) {
    console.log("Nenhum lead encontrado para reprocessar.");
    return;
  }

  console.log(`${disqualified.length} leads encontrados para reprocessar:`);
  disqualified.forEach((l) => {
    console.log(`  - ${l.name} (${l.city}) → razão: "${l.validationReason ?? "—"}"`);
  });

  console.log(`\nResetando status e reenfileirando...`);

  let enqueued = 0;
  for (const lead of disqualified) {
    // Reseta campos de validação e volta para "scraped"
    await db.update(leads)
      .set({
        status: "scraped",
        hasOwnWebsite: null,
        websiteUrl: null,
        websiteConfidence: null,
        validationReason: null,
        validatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    // Reenfileira no pipeline com delay escalonado para não sobrecarregar
    await pipelineQueue.add(
      `reprocess-${lead.id}`,
      { leadId: lead.id },
      { delay: enqueued * 500 }
    );

    enqueued++;
  }

  console.log(`\n✓ ${enqueued} leads reenfileirados no pipeline.`);
  console.log(`  Acompanhe o progresso no dashboard: http://localhost:3000\n`);
}

main()
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeConnection();
    await redisConnection.quit();
  });
