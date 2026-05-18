import { Worker, type Job } from "bullmq";
import { redisConnection, pipelineQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { GoogleMapsScraper } from "../../scraper/google-maps.scraper.js";
import { leadRepository } from "../../../database/repositories/lead.repository.js";
import { betweenPagesDelay } from "../../../utils/delay.js";
import type { ScrapeJobData } from "../../../types/queue.types.js";

const log = createModuleLogger("worker:scrape");

export function createScrapeWorker(): Worker {
  // Browser shared across all jobs in this worker's lifetime.
  // Eliminates the ~2s Chromium launch cost per job.
  let scraper: GoogleMapsScraper | null = null;

  async function getOrInitScraper(): Promise<GoogleMapsScraper> {
    if (!scraper) {
      scraper = new GoogleMapsScraper();
      await scraper.initialize();
      log.info("Browser Playwright inicializado (reutilizável)");
    }
    return scraper;
  }

  async function resetScraper(): Promise<void> {
    if (scraper) {
      await scraper.close().catch((err) =>
        log.warn({ error: String(err) }, "Erro ao fechar browser durante reset")
      );
      scraper = null;
    }
  }

  const worker = new Worker<ScrapeJobData>(
    "scrape",
    async (job: Job<ScrapeJobData>) => {
      const { city, searchQuery, maxResults } = job.data;
      log.info({ query: searchQuery, city }, "Scrape job iniciado");

      let newLeads = 0;
      let skippedDuplicates = 0;

      const s = await getOrInitScraper();
      await job.updateProgress(10);

      let businesses;
      try {
        businesses = await s.scrapeQuery(searchQuery, { city, maxResults, headless: true });
      } catch (err) {
        // Browser may have crashed — reset so next job gets a fresh instance
        await resetScraper();
        throw err;
      }

      await job.updateProgress(60);
      log.info({ count: businesses.length, query: searchQuery }, "Businesses encontrados");

      for (const business of businesses) {
        // upsertFromRaw validates input data and uses ON CONFLICT DO NOTHING,
        // eliminating the TOCTOU race between the old existsByPlaceId + createFromRaw pattern.
        const { lead, created } = await leadRepository.upsertFromRaw(business);

        if (!created) {
          skippedDuplicates++;
          continue;
        }

        newLeads++;

        await pipelineQueue.add(`pipeline-${lead.id}`, {
          leadId: lead.id,
          placeId: lead.placeId,
        });

        await betweenPagesDelay();
      }

      await job.updateProgress(100);
      log.info({ newLeads, skippedDuplicates, query: searchQuery }, "Scrape job concluído");

      return { newLeads, skippedDuplicates };
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Scrape job completado");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, error: err.message }, "Scrape job falhou");
  });

  // Clean up browser when the worker shuts down
  worker.on("closing", () => {
    void resetScraper();
  });

  return worker;
}
