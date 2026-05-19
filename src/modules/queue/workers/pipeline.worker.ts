import { Worker, type Job } from "bullmq";
import { redisConnection, dispatchQueue } from "../queue-manager.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { leadRepository } from "../../../database/repositories/lead.repository.js";
import { websiteValidator } from "../../validator/website-validator.js";
import { nicheClassifier } from "../../ai/niche-classifier.js";
import { scoringEngine } from "../../lead-scoring/scoring-engine.js";
import { contentPersonalizer } from "../../ai/content-personalizer.js";
import { messageGenerator } from "../../ai/message-generator.js";
import { renderScopePage } from "../../renderer/scope-renderer.js";
import { screenshotGenerator } from "../../screenshot/screenshot-generator.js";
import { config } from "../../../config/index.js";
import { isWithinDispatchWindow } from "../../dispatch-schedule.js";
import type { PipelineJobData, DispatchJobData } from "../../../types/queue.types.js";
import type { BusinessRaw, BusinessValidated, BusinessEnriched } from "../../../types/business.types.js";
import type { Lead } from "../../../database/schema.js";

const log = createModuleLogger("worker:pipeline");

// ── Stage helpers ─────────────────────────────────────────────────────────────

async function stageValidate(lead: Lead): Promise<
  | { ok: true; business: BusinessValidated }
  | { ok: false; reason: string }
> {
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
  await leadRepository.updateValidation(lead.id, { ...businessRaw, validation });

  if (validation.hasOwnWebsite) {
    return { ok: false, reason: `possui site próprio: ${validation.websiteUrl ?? "desconhecido"}` };
  }

  return { ok: true, business: { ...businessRaw, validation } };
}

async function stageEnrich(
  leadId: string,
  business: BusinessValidated,
  sourceNiche?: string
): Promise<{ ok: true; enriched: BusinessEnriched } | { ok: false; reason: string }> {
  const nicheResult = sourceNiche
    ? { niche: sourceNiche as import("../../../types/business.types.js").Niche, confidence: 0.97, reasoning: "Derivado da query de busca" }
    : await nicheClassifier.classify(business.name, business.category);
  const enriched = scoringEngine.score(business, nicheResult.niche, nicheResult.confidence);
  await leadRepository.updateEnrichment(leadId, enriched);

  if (enriched.score < config.scraping.minScore) {
    await leadRepository.updateStatus(leadId, "disqualified");
    return { ok: false, reason: `score insuficiente: ${enriched.score} (mínimo: ${config.scraping.minScore})` };
  }

  const targetPhone = enriched.whatsapp ?? enriched.phone;
  if (!targetPhone) {
    await leadRepository.updateStatus(leadId, "disqualified");
    return { ok: false, reason: "sem telefone" };
  }

  return { ok: true, enriched };
}

async function stageRenderAndCapture(leadId: string, enriched: BusinessEnriched): Promise<string> {
  const templateData = await contentPersonalizer.personalize(enriched);
  const scopeFilePath = await renderScopePage(templateData);
  await leadRepository.updatePagePath(leadId, scopeFilePath);

  const screenshot = await screenshotGenerator.capture(scopeFilePath, enriched.name);
  await leadRepository.updateScreenshotPath(leadId, screenshot.filePath);

  return screenshot.filePath;
}

// ── Worker ───────────────────────────────────────────────────────────────────

export function createPipelineWorker(): Worker {
  const worker = new Worker<PipelineJobData>(
    "pipeline",
    async (job: Job<PipelineJobData>) => {
      const { leadId, sourceNiche } = job.data;
      log.info({ leadId }, "Pipeline iniciado");

      const lead = await leadRepository.findById(leadId);
      if (!lead) throw new Error(`Lead ${leadId} não encontrado`);

      // ── Stage 1: Website validation ──────────────────────────────────────
      await job.updateProgress(10);
      log.debug({ name: lead.name }, "Stage 1/4 — validação de site");

      const validationResult = await stageValidate(lead);
      if (!validationResult.ok) {
        log.info({ name: lead.name, reason: validationResult.reason }, "Lead descartado");
        return { status: "disqualified", reason: validationResult.reason };
      }

      // ── Stage 2: Classify + Score ────────────────────────────────────────
      await job.updateProgress(30);
      log.debug({ name: lead.name }, "Stage 2/4 — classificação e score");

      const enrichResult = await stageEnrich(leadId, validationResult.business, sourceNiche);
      if (!enrichResult.ok) {
        log.info({ name: lead.name, reason: enrichResult.reason }, "Lead descartado");
        return { status: "disqualified", reason: enrichResult.reason };
      }

      const { enriched } = enrichResult;

      // ── Stage 3: Render + Screenshot ─────────────────────────────────────
      await job.updateProgress(55);
      log.debug({ name: lead.name }, "Stage 3/4 — renderização e screenshot");

      const mockupPath = await stageRenderAndCapture(leadId, enriched);

      // ── Stage 4: Generate message + enqueue dispatch ─────────────────────
      await job.updateProgress(85);
      log.debug({ name: lead.name }, "Stage 4/4 — mensagem e agendamento de disparo");

      const message = await messageGenerator.generate(enriched);
      const targetPhone = (enriched.whatsapp ?? enriched.phone)!;

      const dispatchJob: DispatchJobData = {
        leadId,
        whatsapp: targetPhone,
        companyName: lead.name,
        screenshotPath: mockupPath,
        message,
      };

      // Durante horário comercial: delay curto (30–90s) para parecer humano.
      // Fora do horário: delay longo — o dispatch.worker vai reagendar para 08:00 de qualquer forma.
      const dispatchDelay = isWithinDispatchWindow()
        ? Math.floor(Math.random() * 60_000) + 30_000   // 30s–90s
        : Math.floor(Math.random() * 300_000) + 60_000; // 1–6 min
      await dispatchQueue.add(`dispatch-${leadId}`, dispatchJob, { delay: dispatchDelay });

      await job.updateProgress(100);
      log.info({ name: lead.name, niche: enriched.niche, score: enriched.score }, "Pipeline concluído");

      return { status: "pipeline_complete", niche: enriched.niche, score: enriched.score };
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
