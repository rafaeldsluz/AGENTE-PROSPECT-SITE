import { Worker, type Job } from "bullmq";
import { redisConnection, pipelineQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { GoogleMapsScraper } from "../../scraper/google-maps.scraper.js";
import { leadRepository } from "../../../database/repositories/lead.repository.js";
import { betweenPagesDelay } from "../../../utils/delay.js";
import type { ScrapeJobData } from "../../../types/queue.types.js";

const log = createModuleLogger("worker:scrape");

export function createScrapeWorker(): Worker {
  const worker = new Worker<ScrapeJobData>(
    "scrape",
    async (job: Job<ScrapeJobData>) => {
      const { city, searchQuery, maxResults } = job.data;
      log.info({ query: searchQuery, city }, "Scrape job iniciado");

      const scraper = new GoogleMapsScraper();
      let newLeads = 0;
      let skippedDuplicates = 0;

      try {
        await scraper.initialize();
        await job.updateProgress(10);

        const businesses = await scraper.scrapeQuery(searchQuery, {
          city,
          maxResults,
          headless: true,
        });

        await job.updateProgress(60);
        log.info({ count: businesses.length, query: searchQuery }, "Businesses encontrados");

        for (const business of businesses) {
          const exists = await leadRepository.existsByPlaceId(business.placeId);
          if (exists) {
            skippedDuplicates++;
            continue;
          }

          const lead = await leadRepository.createFromRaw(business);
          newLeads++;

          // Enfileira no pipeline para validação e processamento
          await pipelineQueue.add(`pipeline-${lead.id}`, { leadId: lead.id, placeId: lead.placeId });

          await betweenPagesDelay();
        }

        await job.updateProgress(100);
        log.info({ newLeads, skippedDuplicates, query: searchQuery }, "Scrape job concluído");

        return { newLeads, skippedDuplicates };
      } finally {
        await scraper.close();
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Um scraper por vez para evitar bloqueio
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Scrape job completado");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, error: err.message }, "Scrape job falhou");
  });

  return worker;
}
