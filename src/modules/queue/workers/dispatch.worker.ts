import { Worker, type Job } from "bullmq";
import { redisConnection, dispatchQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { whatsappDispatcher } from "../../whatsapp/dispatcher.js";
import { isWithinDispatchWindow, isManualOverrideActive, msUntilWindowOpens } from "../../dispatch-schedule.js";
import type { DispatchJobData } from "../../../types/queue.types.js";

const log = createModuleLogger("worker:dispatch");

export function createDispatchWorker(): Worker {
  const worker = new Worker<DispatchJobData>(
    "dispatch",
    async (job: Job<DispatchJobData>) => {
      const { leadId, whatsapp, companyName, screenshotPath, message, pageUrl } = job.data;

      // Verifica janela de horário (08:00–18:00 BRT) a menos que override manual esteja ativo
      if (!isWithinDispatchWindow() && !isManualOverrideActive()) {
        const delayMs = msUntilWindowOpens();
        const hoursUntil = Math.round(delayMs / 3_600_000 * 10) / 10;
        log.info({ company: companyName, hoursUntil }, "Fora da janela de disparo — reagendando para 08:00");
        await dispatchQueue.add(`dispatch-${leadId}-${Date.now()}`, job.data, { delay: delayMs });
        return { status: "deferred", hoursUntil };
      }

      log.info({ company: companyName, phone: whatsapp }, "Dispatch job iniciado");

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

      return { status: "dispatched" };
    },
    {
      connection: redisConnection,
      concurrency: 1, // Apenas 1 disparo por vez para segurança
      limiter: {
        max: 1,
        duration: 120_000, // 1 por 2 minutos no máximo
      },
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
