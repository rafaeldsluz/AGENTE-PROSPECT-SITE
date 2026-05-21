import axios from "axios";
import sharp from "sharp";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("ai:brand-analyzer");

export interface BrandColors {
  primaryColor: string;
  accentColor: string;
  source: "extracted" | "niche_default";
}

const NICHE_DEFAULT_COLORS: Record<string, BrandColors> = {
  advogado:   { primaryColor: "#0a0e1a", accentColor: "#c9a84c", source: "niche_default" },
  clinica:    { primaryColor: "#0f172a", accentColor: "#0ea5e9", source: "niche_default" },
  automoveis: { primaryColor: "#0d1117", accentColor: "#ef4444", source: "niche_default" },
  imoveis:    { primaryColor: "#0f2027", accentColor: "#10b981", source: "niche_default" },
  comercio:   { primaryColor: "#0f1923", accentColor: "#f59e0b", source: "niche_default" },
  outros:     { primaryColor: "#111827", accentColor: "#6366f1", source: "niche_default" },
};

export async function analyzeBrandColors(
  logoUrl: string | null,
  photoUrls: string[],
  niche: string
): Promise<BrandColors> {
  const fallback: BrandColors = NICHE_DEFAULT_COLORS[niche] ?? NICHE_DEFAULT_COLORS["outros"]!;

  const candidates = [logoUrl, ...photoUrls.slice(0, 2)].filter((u): u is string => !!u);

  for (const imageUrl of candidates) {
    try {
      const colors = await extractColorsFromUrl(imageUrl);
      if (colors) {
        log.debug({ imageUrl, primaryColor: colors.primaryColor }, "Paleta extraída da imagem");
        return { ...colors, source: "extracted" };
      }
    } catch (err) {
      log.debug({ imageUrl, error: String(err) }, "Falha ao extrair cores");
    }
  }

  return fallback;
}

async function extractColorsFromUrl(
  imageUrl: string
): Promise<Omit<BrandColors, "source"> | null> {
  const response = await axios.get<ArrayBuffer>(imageUrl, {
    timeout: 8_000,
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectorBot/1.0)" },
    maxContentLength: 4 * 1024 * 1024,
    validateStatus: (s) => s === 200,
  });

  const buffer = Buffer.from(response.data);

  // Redimensiona para 50×50 para análise rápida de cor
  const { data: raw } = await sharp(buffer)
    .resize(50, 50, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = raw.length / 3;
  let rSum = 0, gSum = 0, bSum = 0;

  for (let i = 0; i < raw.length; i += 3) {
    rSum += raw[i]!;
    gSum += raw[i + 1]!;
    bSum += raw[i + 2]!;
  }

  const r = Math.round(rSum / pixelCount);
  const g = Math.round(gSum / pixelCount);
  const b = Math.round(bSum / pixelCount);

  // Verifica saturação — paleta acinzentada não serve como accent
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const saturation = maxC - minC;
  if (saturation < 40) return null; // Muito próximo do cinza — usa padrão do nicho

  // Fundo: versão muito escurecida da cor dominante
  const primaryColor = toHex(
    Math.round(r * 0.18),
    Math.round(g * 0.18),
    Math.round(b * 0.18)
  );

  // Destaque: versão brilhante normalizada da cor dominante
  const boost = maxC > 0 ? Math.min(255 / maxC, 2.2) : 1;
  const accentColor = toHex(
    Math.min(255, Math.round(r * boost)),
    Math.min(255, Math.round(g * boost)),
    Math.min(255, Math.round(b * boost))
  );

  return { primaryColor, accentColor };
}

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export { NICHE_DEFAULT_COLORS };
