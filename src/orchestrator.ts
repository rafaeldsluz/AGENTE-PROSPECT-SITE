import { type Server } from "http";
import { createModuleLogger } from "./utils/logger.js";
import { config } from "./config/index.js";
import { createDashboardServer } from "./dashboard/server.js";
import { checkConnection, closeConnection } from "./database/client.js";
import { leadRepository } from "./database/repositories/lead.repository.js";
import {
  pipelineQueue,
  getQueueStats,
  closeQueues,
  enqueueScrapeJobs,
} from "./modules/queue/queue-manager.js";
import { createScrapeWorker } from "./modules/queue/workers/scrape.worker.js";
import { createPipelineWorker } from "./modules/queue/workers/pipeline.worker.js";
import { createDispatchWorker } from "./modules/queue/workers/dispatch.worker.js";
import { getNicheQueries } from "./modules/scraper/google-maps.scraper.js";
import { screenshotGenerator } from "./modules/screenshot/screenshot-generator.js";
import { initManualOverride } from "./modules/dispatch-schedule.js";
import { cleanOldOutputFiles } from "./utils/output-cleaner.js";
import type { Worker } from "bullmq";

const log = createModuleLogger("orchestrator");

export class Orchestrator {
  private workers: Worker[] = [];
  private dashboardServer: Server | null = null;
  private shutdownSignal = false;

  async start(): Promise<void> {
    log.info("Iniciando Sistema de Prospecção Automatizada");

    await this.checkInfrastructure();
    await initManualOverride();
    await cleanOldOutputFiles(config.paths.pages, config.paths.screenshots);
    this.dashboardServer = createDashboardServer(config.app.dashboardPort);
    await this.startWorkers();
    await this.scheduleScraping();
    await this.printStats();

    log.info({
      cities: config.scraping.targetCities,
      niches: config.scraping.targetNiches,
      maxLeads: config.scraping.maxLeadsPerRun,
    }, "Sistema iniciado com sucesso");
  }

  private async checkInfrastructure(): Promise<void> {
    log.info("Verificando infraestrutura...");

    try {
      await checkConnection();
      log.info("PostgreSQL: conectado");
    } catch (err) {
      log.error({ error: String(err) }, "PostgreSQL: FALHA na conexão");
      throw new Error("Banco de dados não acessível. Execute: docker-compose up -d");
    }

    const stats = await getQueueStats();
    log.info({ stats }, "Redis/BullMQ: conectado");
  }

  private startWorkers() {
    log.info("Iniciando workers...");

    const scrapeWorker = createScrapeWorker();
    const pipelineWorker = createPipelineWorker();
    const dispatchWorker = createDispatchWorker();

    this.workers = [scrapeWorker, pipelineWorker, dispatchWorker];
    log.info("Workers iniciados: scrape, pipeline, dispatch");
  }

  private async scheduleScraping(): Promise<void> {
    const { targetCities, targetNiches, maxLeadsPerRun } = config.scraping;
    const queries = getNicheQueries(targetNiches);

    log.info({ cities: targetCities.length, queries: queries.length, maxLeadsPerRun }, "Agendando jobs de scraping");

    const jobCount = await enqueueScrapeJobs(targetCities, targetNiches, maxLeadsPerRun, queries);

    if (jobCount > 0) {
      log.info({ totalJobs: jobCount }, "Jobs de scraping agendados");
    }
  }

  async runPipelineForExistingLeads(): Promise<void> {
    log.info("Reprocessando leads existentes validados mas não processados");

    const leads = await leadRepository.getValidatedNotScored(50);
    for (const lead of leads) {
      await pipelineQueue.add(`reprocess-${lead.id}`, {
        leadId: lead.id,
        placeId: lead.placeId,
      });
    }

    log.info({ count: leads.length }, "Leads enfileirados para reprocessamento");
  }

  async printStats(): Promise<void> {
    const dbStats = await leadRepository.countByStatus();
    const queueStats = await getQueueStats();

    log.info({ database: dbStats, queues: queueStats }, "=== ESTATÍSTICAS DO SISTEMA ===");
  }

  async shutdown(): Promise<void> {
    if (this.shutdownSignal) return;
    this.shutdownSignal = true;

    log.info("Encerrando sistema...");

    await Promise.all(this.workers.map((w) => w.close()));
    await screenshotGenerator.close();
    await closeQueues();
    await closeConnection();
    this.dashboardServer?.close();

    log.info("Sistema encerrado com segurança");
  }
}
