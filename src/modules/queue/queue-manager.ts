import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import type { ScrapeJobData, PipelineJobData, DispatchJobData } from "../../types/queue.types.js";

const log = createModuleLogger("queue");

export const redisConnection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  log.error({ error: String(err) }, "Erro na conexão Redis");
});

const QUEUE_DEFAULTS = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
};

export const scrapeQueue = new Queue<ScrapeJobData>("scrape", QUEUE_DEFAULTS);
export const pipelineQueue = new Queue<PipelineJobData>("pipeline", {
  ...QUEUE_DEFAULTS,
  defaultJobOptions: {
    ...QUEUE_DEFAULTS.defaultJobOptions,
    attempts: 2,
  },
});
export const dispatchQueue = new Queue<DispatchJobData>("dispatch", {
  ...QUEUE_DEFAULTS,
  defaultJobOptions: {
    ...QUEUE_DEFAULTS.defaultJobOptions,
    attempts: 2,
  },
});

export async function getQueueStats() {
  const [scrapeStats, pipelineStats, dispatchStats] = await Promise.all([
    getStats(scrapeQueue),
    getStats(pipelineQueue),
    getStats(dispatchQueue),
  ]);

  return { scrape: scrapeStats, pipeline: pipelineStats, dispatch: dispatchStats };
}

async function getStats(queue: Queue) {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

export async function getDispatchFailedJobs(limit = 10) {
  const jobs = await dispatchQueue.getFailed(0, limit - 1);
  return jobs.map((j) => ({
    jobId: j.id,
    companyName: j.data.companyName,
    whatsapp: j.data.whatsapp,
    reason: j.failedReason ?? "Motivo desconhecido",
    failedAt: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
  }));
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    scrapeQueue.close(),
    pipelineQueue.close(),
    dispatchQueue.close(),
  ]);
  await redisConnection.quit();
}
