import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import type { TemplateData, RenderedPage } from "../../types/template.types.js";
import type { Niche } from "../../types/business.types.js";
import { renderClinicaTemplate } from "./templates/clinica.template.js";
import { renderImoveisTemplate } from "./templates/imoveis.template.js";
import { renderAdvogadoTemplate } from "./templates/advogado.template.js";
import { renderOficinaTemplate } from "./templates/oficina.template.js";

const log = createModuleLogger("renderer");

type TemplateRenderer = (data: TemplateData) => string;

const TEMPLATE_MAP: Record<Niche, TemplateRenderer> = {
  clinica: renderClinicaTemplate,
  imoveis: renderImoveisTemplate,
  advogado: renderAdvogadoTemplate,
  servicos: renderOficinaTemplate,  // layout técnico/profissional
  outros: renderClinicaTemplate,    // fallback neutro
};

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export class TemplateEngine {
  async render(data: TemplateData): Promise<RenderedPage> {
    const renderer = TEMPLATE_MAP[data.niche];
    const html = renderer(data);

    await fs.mkdir(config.paths.pages, { recursive: true });

    const filename = `${sanitizeFilename(data.companyName)}-${Date.now()}.html`;
    const filePath = path.join(config.paths.pages, filename);

    await fs.writeFile(filePath, html, "utf-8");
    log.info({ company: data.companyName, file: filename }, "Página renderizada");

    return {
      html,
      filePath: path.resolve(filePath),
      companyName: data.companyName,
      niche: data.niche,
    };
  }
}

export const templateEngine = new TemplateEngine();
