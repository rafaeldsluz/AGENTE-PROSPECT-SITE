import { chromium, type Browser } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";
import { sleep } from "../../utils/delay.js";

const log = createModuleLogger("screenshot");

export interface ScreenshotResult {
  filePath: string;
  width: number;
  height: number;
}

export class ScreenshotGenerator {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    log.debug("Browser para screenshot inicializado");
  }

  async capture(htmlFilePath: string, companyName: string): Promise<ScreenshotResult> {
    if (!this.browser) await this.initialize();

    await fs.mkdir(config.paths.screenshots, { recursive: true });

    return withRetry(
      () => this.doCapture(htmlFilePath, companyName),
      { maxAttempts: 3, baseDelayMs: 2_000, maxDelayMs: 10_000 }
    );
  }

  private async doCapture(htmlFilePath: string, companyName: string): Promise<ScreenshotResult> {
    const page = await this.browser!.newPage();

    try {
      // Viewport de desktop premium
      await page.setViewportSize({ width: 1440, height: 900 });

      // Carrega o HTML local
      const fileUrl = `file:///${htmlFilePath.replace(/\\/g, "/")}`;
      await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 30_000 });

      // Aguarda fontes e imagens carregarem
      await sleep(2_000);

      // Garante que todas as imagens carregaram
      await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll("img"));
        return Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve());
              img.addEventListener("error", () => resolve()); // ignora erro de imagem
            });
          })
        );
      });

      const sanitized = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);

      const filename = `${sanitized}-${Date.now()}.png`;
      const outputPath = path.join(config.paths.screenshots, filename);

      // Screenshot do viewport (acima da dobra - área de maior impacto visual)
      await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: 1440, height: 900 },
        type: "png",
      });

      log.info({ company: companyName, file: filename }, "Screenshot capturada");

      return {
        filePath: path.resolve(outputPath),
        width: 1440,
        height: 900,
      };
    } finally {
      await page.close();
    }
  }

  async captureFullPage(htmlFilePath: string, companyName: string): Promise<ScreenshotResult> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();

    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      const fileUrl = `file:///${htmlFilePath.replace(/\\/g, "/")}`;
      await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 30_000 });
      await sleep(2_000);

      const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);
      const filename = `${sanitized}-full-${Date.now()}.png`;
      const outputPath = path.join(config.paths.screenshots, filename);

      await page.screenshot({ path: outputPath, fullPage: true, type: "png" });

      const viewport = page.viewportSize() ?? { width: 1440, height: 900 };

      return {
        filePath: path.resolve(outputPath),
        width: viewport.width,
        height: viewport.height,
      };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }
}

export const screenshotGenerator = new ScreenshotGenerator();
