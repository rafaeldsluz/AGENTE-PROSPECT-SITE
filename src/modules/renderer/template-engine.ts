import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import type { TemplateData, RenderedPage } from "../../types/template.types.js";
import { renderDemoTemplate } from "./demo-template-engine.js";

const log = createModuleLogger("renderer");

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
    const html = renderDemoTemplate(data);

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
