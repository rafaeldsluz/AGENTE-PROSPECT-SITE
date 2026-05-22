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
      await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Aguarda fontes remotas (Google Fonts) e imagens
      await Promise.race([
        page.evaluate(() =>
          document.fonts.ready.then(() => {
            const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
            return Promise.all(imgs.map((img) =>
              img.complete ? Promise.resolve() : new Promise<void>((res) => {
                img.addEventListener("load", () => res());
                img.addEventListener("error", () => res());
              })
            ));
          })
        ),
        sleep(4_000), // tempo para imagens CDN (Unsplash) carregarem
      ]);

      const sanitized = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);

      const filename = `${sanitized}-${Date.now()}.jpg`;
      const outputPath = path.join(config.paths.screenshots, filename);

      // Full-page JPEG — captura a landing page completa para prospecção
      await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: "jpeg",
        quality: 88,
      });

      const { width, height } = page.viewportSize() ?? { width: 1440, height: 0 };
      log.info({ company: companyName, file: filename }, "Screenshot capturada");

      return {
        filePath: path.resolve(outputPath),
        width,
        height,
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
