import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("mockup");

export type MockupStyle = "laptop" | "browser" | "phone" | "none";

export class MockupComposer {
  async compose(
    screenshotPath: string,
    companyName: string,
    style: MockupStyle = "browser"
  ): Promise<string> {
    if (style === "none") return screenshotPath;

    try {
      return await this.composeBrowserMockup(screenshotPath, companyName);
    } catch (err) {
      log.warn({ error: String(err) }, "Falha ao compor mockup, usando screenshot original");
      return screenshotPath;
    }
  }

  private async composeBrowserMockup(screenshotPath: string, companyName: string): Promise<string> {
    const screenshot = sharp(screenshotPath);
    const meta = await screenshot.metadata();

    const screenW = meta.width ?? 1440;
    const screenH = meta.height ?? 900;

    // Barra do browser em SVG
    const browserBarHeight = 44;
    const padding = 20;
    const totalW = screenW + padding * 2;
    const totalH = screenH + browserBarHeight + padding * 2;

    const browserBarSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
  <!-- Fundo do mockup com sombra simulada -->
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Background da página -->
  <rect width="${totalW}" height="${totalH}" fill="#e5e7eb" rx="0"/>

  <!-- Janela do browser -->
  <rect x="${padding}" y="${padding}" width="${screenW}" height="${screenH + browserBarHeight}" fill="white" rx="12"
        filter="url(#shadow)"/>

  <!-- Barra superior do browser -->
  <rect x="${padding}" y="${padding}" width="${screenW}" height="${browserBarHeight}" fill="#f1f5f9" rx="12"/>
  <rect x="${padding}" y="${padding + browserBarHeight - 6}" width="${screenW}" height="6" fill="#f1f5f9"/>

  <!-- Botões traffic lights -->
  <circle cx="${padding + 18}" cy="${padding + 22}" r="6" fill="#ef4444"/>
  <circle cx="${padding + 36}" cy="${padding + 22}" r="6" fill="#f59e0b"/>
  <circle cx="${padding + 54}" cy="${padding + 22}" r="6" fill="#22c55e"/>

  <!-- URL bar -->
  <rect x="${padding + 80}" y="${padding + 10}" width="${screenW - 160}" height="24" fill="white" rx="12"
        stroke="#e2e8f0" stroke-width="1"/>
  <text x="${padding + screenW / 2}" y="${padding + 26}" text-anchor="middle" fill="#64748b"
        font-family="Inter, Arial, sans-serif" font-size="11">
    🔒 ${companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}.com.br
  </text>
</svg>`.trim();

    // Converte o SVG em buffer
    const svgBuffer = Buffer.from(browserBarSvg);

    const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);
    const outputPath = path.join(config.paths.screenshots, `${sanitized}-mockup-${Date.now()}.png`);

    await fs.mkdir(config.paths.screenshots, { recursive: true });

    // Compõe: fundo SVG + screenshot dentro da janela
    await sharp(svgBuffer)
      .png()
      .composite([
        {
          input: await screenshot.resize(screenW, screenH).png().toBuffer(),
          left: padding,
          top: padding + browserBarHeight,
        },
      ])
      .toFile(outputPath);

    log.debug({ company: companyName, file: outputPath }, "Mockup composto");
    return path.resolve(outputPath);
  }
}

export const mockupComposer = new MockupComposer();
