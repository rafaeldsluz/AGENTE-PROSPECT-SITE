import { Worker, type Job } from "bullmq";
import { redisConnection, dispatchQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { leadRepository } from "../../../database/repositories/lead.repository.js";
import { websiteValidator } from "../../validator/website-validator.js";
import { nicheClassifier } from "../../ai/niche-classifier.js";
import { scoringEngine } from "../../lead-scoring/scoring-engine.js";
import { contentPersonalizer } from "../../ai/content-personalizer.js";
import { messageGenerator } from "../../ai/message-generator.js";
import { templateEngine } from "../../renderer/template-engine.js";
import { screenshotGenerator } from "../../screenshot/screenshot-generator.js";
import { mockupComposer } from "../../screenshot/mockup-composer.js";
import type { PipelineJobData, DispatchJobData } from "../../../types/queue.types.js";
import type { BusinessRaw, BusinessValidated } from "../../../types/business.types.js";

const log = createModuleLogger("worker:pipeline");

export function createPipelineWorker(): Worker {
  const worker = new Worker<PipelineJobData>(
    "pipeline",
    async (job: Job<PipelineJobData>) => {
      const { leadId } = job.data;
      log.info({ leadId }, "Pipeline iniciado");

      const lead = await leadRepository.findById(leadId);
      if (!lead) throw new Error(`Lead ${leadId} não encontrado`);

      // ── Etapa 1: Validação de site ───────────────────────────────────────
      await job.updateProgress(10);
      log.debug({ name: lead.name }, "Etapa 1: Validando site");

      const businessRaw: BusinessRaw = {
        placeId: lead.placeId,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        city: lead.city,
        phone: lead.phone ?? null,
        whatsapp: lead.whatsapp ?? null,
        website: lead.website ?? null,
        rating: lead.rating ?? null,
        reviewCount: lead.reviewCount ?? null,
        photos: (lead.photos as string[]) ?? [],
        logoUrl: lead.logoUrl ?? null,
        instagram: lead.instagram ?? null,
        facebook: lead.facebook ?? null,
        googleMapsUrl: lead.googleMapsUrl,
        scrapedAt: lead.scrapedAt,
      };

      const validation = await websiteValidator.validate(businessRaw);

      if (validation.hasOwnWebsite) {
        log.info({ name: lead.name, url: validation.websiteUrl }, "Lead descartado: possui site próprio");
        await leadRepository.updateValidation(leadId, { ...businessRaw, validation });
        return { status: "disqualified", reason: validation.reason };
      }

      const businessValidated: BusinessValidated = { ...businessRaw, validation };
      await leadRepository.updateValidation(leadId, businessValidated);

      // ── Etapa 2: Classificação de nicho + scoring ──────────────────────
      await job.updateProgress(30);
      log.debug({ name: lead.name }, "Etapa 2: Classificando nicho");

      const nicheResult = await nicheClassifier.classify(lead.name, lead.category);
      const businessEnriched = scoringEngine.score(businessValidated, nicheResult.niche, nicheResult.confidence);
      await leadRepository.updateEnrichment(leadId, businessEnriched);

      // Mínimo de score para continuar
      if (businessEnriched.score < 20) {
        log.info({ name: lead.name, score: businessEnriched.score }, "Lead com score baixo, pulando");
        await leadRepository.updateStatus(leadId, "disqualified");
        return { status: "low_score", score: businessEnriched.score };
      }

      // Verifica se tem telefone para enviar
      const targetPhone = lead.whatsapp ?? lead.phone;
      if (!targetPhone) {
        log.info({ name: lead.name }, "Lead sem telefone, pulando");
        await leadRepository.updateStatus(leadId, "disqualified");
        return { status: "no_phone" };
      }

      // ── Etapa 3: Personalização de conteúdo ─────────────────────────────
      await job.updateProgress(50);
      log.debug({ name: lead.name }, "Etapa 3: Personalizando conteúdo");

      const templateData = await contentPersonalizer.personalize(businessEnriched);

      // ── Etapa 4: Renderização do template ───────────────────────────────
      await job.updateProgress(65);
      log.debug({ name: lead.name }, "Etapa 4: Renderizando template");

      const renderedPage = await templateEngine.render(templateData);
      await leadRepository.updatePagePath(leadId, renderedPage.filePath);

      // ── Etapa 5: Screenshot ──────────────────────────────────────────────
      await job.updateProgress(80);
      log.debug({ name: lead.name }, "Etapa 5: Capturando screenshot");

      const screenshot = await screenshotGenerator.capture(renderedPage.filePath, lead.name);
      const mockupPath = await mockupComposer.compose(screenshot.filePath, lead.name, "browser");

      await leadRepository.updateScreenshotPath(leadId, mockupPath);

      // ── Etapa 6: Gera mensagem e enfileira disparo ───────────────────────
      await job.updateProgress(90);
      log.debug({ name: lead.name }, "Etapa 6: Gerando mensagem e enfileirando disparo");

      const message = await messageGenerator.generate(businessEnriched);

      const dispatchJob: DispatchJobData = {
        leadId,
        whatsapp: targetPhone,
        companyName: lead.name,
        screenshotPath: mockupPath,
        message,
      };

      await dispatchQueue.add(`dispatch-${leadId}`, dispatchJob, {
        delay: Math.floor(Math.random() * 300_000) + 60_000, // Delay aleatório 1-6 min
      });

      await job.updateProgress(100);
      log.info({ name: lead.name, niche: businessEnriched.niche, score: businessEnriched.score }, "Pipeline concluído");

      return {
        status: "pipeline_complete",
        niche: businessEnriched.niche,
        score: businessEnriched.score,
      };
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id, leadId: job.data.leadId }, "Job pipeline completado");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, leadId: job?.data.leadId, error: err.message }, "Job pipeline falhou");
  });

  return worker;
}
