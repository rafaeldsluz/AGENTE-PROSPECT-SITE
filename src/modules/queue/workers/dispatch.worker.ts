import { Worker, type Job } from "bullmq";
import { redisConnection, dispatchQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { whatsappDispatcher } from "../../whatsapp/dispatcher.js";
import { isWithinDispatchWindow, isManualOverrideActive, msUntilWindowOpens } from "../../dispatch-schedule.js";
import { sleep } from "../../../utils/delay.js";
import { config } from "../../../config/index.js";
import type { DispatchJobData } from "../../../types/queue.types.js";

const log = createModuleLogger("worker:dispatch");

let lastDispatchAt = 0;
let dispatchesThisHour = 0;
let hourWindowStart = Date.now();

export function createDispatchWorker(): Worker {
  const worker = new Worker<DispatchJobData>(
    "dispatch",
    async (job: Job<DispatchJobData>) => {
      const { leadId, whatsapp, companyName, screenshotPath, message, pageUrl } = job.data;

      log.info({ company: companyName, phone: whatsapp }, "Dispatch job iniciado");

      // ── Janela de disparo (08:00–18:00 BRT) ─────────────────────────────────
      if (!isManualOverrideActive() && !isWithinDispatchWindow()) {
        const delay = msUntilWindowOpens();
        log.info({ company: companyName, delayMs: delay }, "Fora da janela de disparo, reagendando");
        await dispatchQueue.add(`dispatch-rescheduled-${leadId}`, job.data, {
          delay,
          attempts: 3,
          backoff: { type: "fixed", delay: 60_000 },
        });
        return { status: "rescheduled" };
      }

      // ── Limite por hora ───────────────────────────────────────────────────────
      const now = Date.now();
      if (now - hourWindowStart > 3_600_000) {
        dispatchesThisHour = 0;
        hourWindowStart = now;
      }
      if (dispatchesThisHour >= config.whatsapp.maxPerHour) {
        const resetIn = 3_600_000 - (now - hourWindowStart);
        log.warn({ company: companyName, resetInMs: resetIn }, "Limite horário atingido, reagendando");
        await dispatchQueue.add(`dispatch-hourly-${leadId}`, job.data, {
          delay: resetIn + 5_000,
          attempts: 3,
          backoff: { type: "fixed", delay: 60_000 },
        });
        return { status: "rate_limited" };
      }

      // ── Delay humanizado entre mensagens ──────────────────────────────────────
      const elapsed = Date.now() - lastDispatchAt;
      const { minDelayMs, maxDelayMs } = config.whatsapp;
      const targetDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs) + minDelayMs);
      if (lastDispatchAt > 0 && elapsed < targetDelay) {
        const wait = targetDelay - elapsed;
        log.debug({ company: companyName, waitMs: wait }, "Aguardando delay humanizado");
        await sleep(wait);
      }

      const success = await whatsappDispatcher.dispatch({
        leadId,
        phone: whatsapp,
        message,
        screenshotPath,
        companyName,
        ...(pageUrl ? { pageUrl } : {}),
      });

      if (!success) {
        log.warn({ company: companyName }, "Dispatch retornou false (rate limit ou duplicado)");
        return { status: "skipped" };
      }

      lastDispatchAt = Date.now();
      dispatchesThisHour++;

      return { status: "dispatched" };
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id, company: job.data.companyName }, "Dispatch completado");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, company: job?.data.companyName, error: err.message }, "Dispatch falhou");
  });

  return worker;
}
