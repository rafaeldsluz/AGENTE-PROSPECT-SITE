/**
 * Reprocessa leads screenshot_ready com os novos templates premium.
 *
 * O que faz:
 * 1. Drena a fila dispatch (remove jobs antigos com screenshots velhos)
 * 2. Reseta todos os screenshot_ready → scored (mantém niche/score, limpa pagePath/screenshotPath)
 * 3. Reenfileira no pipeline com sourceNiche para re-renderizar com novos templates
 * 4. Ativa override manual de disparo para disparar imediatamente ao processar
 */
import "dotenv/config";
import { db } from "../database/client.js";
import { leads } from "../database/schema.js";
import { inArray, eq } from "drizzle-orm";
import { pipelineQueue, dispatchQueue } from "../modules/queue/queue-manager.js";
import { setManualOverride } from "../modules/dispatch-schedule.js";
import { createModuleLogger } from "../utils/logger.js";

const log = createModuleLogger("reprocess:new-templates");

async function main() {
  log.info("=== Reprocessamento com novos templates ===");

  // ── 1. Busca leads screenshot_ready ────────────────────────────────────────
  const readyLeads = await db
    .select({ id: leads.id, name: leads.name, niche: leads.niche, placeId: leads.placeId })
    .from(leads)
    .where(inArray(leads.status, ["screenshot_ready", "page_generated"]));

  log.info({ total: readyLeads.length }, "Leads encontrados para reprocessamento");

  if (readyLeads.length === 0) {
    log.info("Nenhum lead para reprocessar.");
    process.exit(0);
  }

  // ── 2. Drena fila dispatch (remove jobs com screenshots antigos) ────────────
  log.info("Drenando fila dispatch (remove jobs antigos)...");
  await dispatchQueue.drain();
  const drained = await dispatchQueue.getJobCounts("waiting", "delayed");
  log.info({ remaining: drained }, "Fila dispatch drenada");

  // ── 3. Reseta status → scored e limpa paths ─────────────────────────────────
  log.info("Resetando leads para status 'scored'...");
  const ids = readyLeads.map((l) => l.id);

  // Processa em lotes de 100 para não sobrecarregar a query
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    await db
      .update(leads)
      .set({
        status: "scored",
        pagePath: null,
        screenshotPath: null,
        pageUrl: null,
        updatedAt: new Date(),
      })
      .where(inArray(leads.id, batch));
  }
  log.info({ total: ids.length }, "Leads resetados para scored");

  // ── 4. Reenfileira no pipeline ──────────────────────────────────────────────
  log.info("Enfileirando pipeline jobs...");
  let enqueued = 0;

  for (const lead of readyLeads) {
    await pipelineQueue.add(
      `rerender-${lead.id}-${Date.now()}`,
      {
        leadId: lead.id,
        placeId: lead.placeId,
        // Passa nicho já classificado para pular re-classificação IA
        sourceNiche: lead.niche ?? undefined,
      },
      { priority: 10 } // prioridade alta para processar antes dos novos scrapes
    );
    enqueued++;

    if (enqueued % 50 === 0) {
      log.info({ enqueued, total: readyLeads.length }, "Progresso de enfileiramento...");
    }
  }

  // ── 5. Ativa override manual para disparar imediatamente ───────────────────
  log.info("Ativando override manual de disparo...");
  await setManualOverride(true);

  log.info(
    { leads: readyLeads.length, pipelineJobs: enqueued },
    "✅ Concluído! Pipeline vai re-renderizar com novos templates e disparar automaticamente."
  );

  log.info("Os leads serão processados com concorrência 3. Acompanhe no dashboard em http://localhost:3000");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
