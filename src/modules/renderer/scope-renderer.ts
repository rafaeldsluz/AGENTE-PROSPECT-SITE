import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import type { TemplateData } from "../../types/template.types.js";

const log = createModuleLogger("scope-renderer");

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function buildLogoHtml(data: TemplateData): string {
  if (data.logoUrl) {
    return `<img src="${data.logoUrl}" alt="Logo" class="logo-img" />`;
  }
  const initial = data.companyName.charAt(0).toUpperCase();
  return `<div class="logo-initial">${initial}</div>`;
}

function buildServicesHtml(data: TemplateData): string {
  if (!data.services.length) return "";
  return data.services
    .map(
      (s) => `
    <div class="service-card">
      <span class="service-icon">${s.icon}</span>
      <div class="service-info">
        <strong>${s.name}</strong>
        <span>${s.description}</span>
      </div>
    </div>`
    )
    .join("");
}

function buildDifferentialsHtml(data: TemplateData): string {
  return data.differentials
    .map((d) => `<div class="diff-item">✅ ${d}</div>`)
    .join("");
}

export async function renderScopePage(data: TemplateData): Promise<string> {
  const logo = buildLogoHtml(data);
  const services = buildServicesHtml(data);
  const differentials = buildDifferentialsHtml(data);

  // Fundo: logo como imagem borrada se disponível, senão gradiente do nicho
  const bgStyle = data.logoUrl
    ? `background: linear-gradient(135deg, ${data.primaryColor}ee 0%, ${data.primaryColor}cc 50%, ${data.accentColor}44 100%);`
    : `background: linear-gradient(135deg, ${data.primaryColor} 0%, #0f0f1a 50%, ${data.accentColor}33 100%);`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Escopo Digital — ${data.companyName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      width: 1440px;
      height: 900px;
      overflow: hidden;
      ${bgStyle}
      color: #fff;
      display: flex;
      flex-direction: column;
    }

    /* ── Noise texture overlay ── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
    }

    /* ── Accent glow ── */
    body::after {
      content: '';
      position: fixed;
      top: -200px;
      right: -200px;
      width: 700px;
      height: 700px;
      border-radius: 50%;
      background: radial-gradient(circle, ${data.accentColor}55 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .wrapper {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: 100%;
      gap: 0;
    }

    /* ── LEFT COLUMN ── */
    .left {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 56px 48px 48px 64px;
      border-right: 1px solid rgba(255,255,255,0.08);
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 14px;
      background: rgba(255,255,255,0.1);
      padding: 4px;
    }

    .logo-initial {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: ${data.accentColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
      color: #fff;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.2;
      color: #fff;
    }

    .brand-meta {
      font-size: 13px;
      color: rgba(255,255,255,0.55);
      margin-top: 2px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${data.accentColor}22;
      border: 1px solid ${data.accentColor}44;
      color: ${data.accentColor};
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 100px;
    }

    .headline {
      font-size: 42px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #fff;
      margin-top: 8px;
    }

    .headline em {
      font-style: normal;
      color: ${data.accentColor};
    }

    .subtitle {
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255,255,255,0.65);
      max-width: 420px;
      margin-top: 16px;
    }

    .hero-block {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .divider {
      height: 1px;
      background: rgba(255,255,255,0.10);
      margin: 20px 0;
    }

    .cta-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #25d366;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 100px;
      text-decoration: none;
    }

    .cta-note {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }

    /* ── RIGHT COLUMN ── */
    .right {
      display: flex;
      flex-direction: column;
      padding: 56px 64px 48px 48px;
      gap: 28px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${data.accentColor};
      opacity: 0.85;
    }

    .services-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      flex: 1;
    }

    .service-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      padding: 14px 16px;
      transition: border-color 0.2s;
    }

    .service-icon {
      font-size: 22px;
      line-height: 1;
      flex-shrink: 0;
    }

    .service-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .service-info strong {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }

    .service-info span {
      font-size: 11px;
      color: rgba(255,255,255,0.50);
      line-height: 1.4;
    }

    .diff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .diff-item {
      font-size: 12px;
      color: rgba(255,255,255,0.72);
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 8px 12px;
      font-weight: 500;
    }

    .watermark {
      font-size: 10px;
      color: rgba(255,255,255,0.20);
      letter-spacing: 0.06em;
      text-align: right;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- LEFT -->
    <div class="left">
      <div class="brand-row">
        ${logo}
        <div>
          <div class="brand-name">${data.companyName}</div>
          <div class="brand-meta">📍 ${data.city}</div>
        </div>
      </div>

      <div class="hero-block">
        <div class="badge">✨ Escopo de Presença Digital</div>
        <h1 class="headline">${data.heroHeadline.replace(/([A-Z][^A-Z\s]{3,})/g, "<em>$1</em>")}</h1>
        <p class="subtitle">${data.heroSubtitle}</p>
      </div>

      <div>
        <div class="divider"></div>
        <div class="cta-row">
          <div class="cta-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            ${data.ctaText}
          </div>
          <span class="cta-note">Proposta gratuita e sem compromisso</span>
        </div>
      </div>
    </div>

    <!-- RIGHT -->
    <div class="right">
      <div>
        <div class="section-label">Serviços incluídos na página</div>
        <div class="services-grid" style="margin-top: 14px;">
          ${services}
        </div>
      </div>

      <div>
        <div class="section-label">Diferenciais destacados</div>
        <div class="diff-grid" style="margin-top: 14px;">
          ${differentials}
        </div>
      </div>

      <div class="watermark">PROPOSTA EXCLUSIVA · ${data.companyName.toUpperCase()}</div>
    </div>

  </div>
</body>
</html>`;

  await fs.mkdir(config.paths.pages, { recursive: true });

  const filename = `scope-${sanitizeFilename(data.companyName)}-${Date.now()}.html`;
  const filePath = path.join(config.paths.pages, filename);
  await fs.writeFile(filePath, html, "utf-8");

  log.info({ company: data.companyName, file: filename }, "Página de escopo renderizada");
  return path.resolve(filePath);
}
