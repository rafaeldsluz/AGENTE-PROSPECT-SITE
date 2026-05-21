import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import type { TemplateData } from "../../types/template.types.js";
import type { Niche } from "../../types/business.types.js";

const log = createModuleLogger("scope-renderer");

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoHtml(data: TemplateData, size = 64): string {
  const initial = esc(data.companyName.charAt(0).toUpperCase());
  const fontSize = Math.round(size * 0.42);
  if (data.logoUrl) {
    return `<img src="${esc(data.logoUrl)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,0.08);padding:6px;flex-shrink:0" onerror="this.style.display='none'" />`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:12px;background:${data.accentColor};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:900;color:#fff;flex-shrink:0;letter-spacing:-0.02em">${initial}</div>`;
}

function starsHtml(rating: number | null | undefined): string {
  if (!rating) return "";
  const filled = Math.round(rating);
  return Array.from({ length: 5 }, (_, i) => {
    const c = i < filled ? "#fbbf24" : "rgba(255,255,255,0.18)";
    return `<span style="color:${c};font-size:15px;line-height:1">★</span>`;
  }).join("");
}

function ratingBlock(data: TemplateData): string {
  if (!data.rating && !data.reviewCount) return "";
  return `<div style="display:flex;align-items:center;gap:10px;margin-top:20px">
    <div style="display:flex;gap:1px">${starsHtml(data.rating)}</div>
    ${data.rating ? `<span style="font-size:15px;font-weight:700;color:#fbbf24">${data.rating.toFixed(1)}</span>` : ""}
    ${data.reviewCount ? `<span style="font-size:12px;color:rgba(255,255,255,0.4)">${data.reviewCount.toLocaleString("pt-BR")} avaliações no Google</span>` : ""}
  </div>`;
}

function servicesGrid(services: TemplateData["services"]): string {
  if (!services.length) return "";
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${services.slice(0, 4).map(s => `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:14px 16px;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:20px;line-height:1.1;flex-shrink:0">${esc(s.icon)}</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:#fff;line-height:1.3">${esc(s.name)}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.48);margin-top:3px;line-height:1.4">${esc(s.description)}</div>
        </div>
      </div>`).join("")}
  </div>`;
}

function servicesList(services: TemplateData["services"]): string {
  if (!services.length) return "";
  return `<div style="display:flex;flex-direction:column;gap:9px">
    ${services.slice(0, 4).map(s => `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px">
        <span style="font-size:18px;flex-shrink:0;width:24px;text-align:center">${esc(s.icon)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#fff;line-height:1.2">${esc(s.name)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.42);margin-top:2px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.description)}</div>
        </div>
      </div>`).join("")}
  </div>`;
}

function differentialItems(items: string[], accent: string): string {
  return items.slice(0, 4).map(d =>
    `<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(255,255,255,0.72);font-weight:500;line-height:1.45">
      <span style="color:${accent};font-size:13px;flex-shrink:0;margin-top:1px">✓</span>${esc(d)}
    </div>`
  ).join("");
}

function ctaBtn(data: TemplateData, bgColor: string, radius = "100px"): string {
  return `<div style="display:inline-flex;align-items:center;gap:10px;background:${bgColor};color:#fff;font-size:15px;font-weight:700;padding:14px 28px;border-radius:${radius};letter-spacing:0.01em;cursor:pointer;white-space:nowrap">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
    ${esc(data.ctaText)}
  </div>`;
}

const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />`;

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;width:1440px;height:900px;overflow:hidden;color:#fff;display:flex;flex-direction:column}`;

// ── Template: CLÍNICA / SAÚDE ─────────────────────────────────────────────────

function buildClinicaHtml(data: TemplateData): string {
  const ac = data.accentColor;
  const bg = data.primaryColor;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:linear-gradient(145deg,${bg} 0%,#071020 55%,${ac}14 100%);position:relative}
    body::before{content:'';position:fixed;top:-260px;right:-130px;width:580px;height:580px;border-radius:50%;background:radial-gradient(circle,${ac}38 0%,transparent 65%);pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;bottom:-180px;left:-80px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,${ac}18 0%,transparent 65%);pointer-events:none;z-index:0}
  </style>
</head>
<body>
<div style="position:relative;z-index:1;display:grid;grid-template-columns:55% 45%;height:100%">

  <!-- LEFT -->
  <div style="display:flex;flex-direction:column;padding:52px 56px;border-right:1px solid rgba(255,255,255,0.07);justify-content:space-between">

    <div style="display:flex;align-items:center;gap:16px">
      ${logoHtml(data, 60)}
      <div>
        <div style="font-size:21px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.01em">${esc(data.companyName)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-top:4px">📍 ${esc(data.city)}</div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:28px 0 20px">
      <div style="display:inline-flex;align-items:center;gap:7px;background:${ac}1a;border:1px solid ${ac}40;color:${ac};font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;padding:6px 14px;border-radius:100px;width:fit-content">
        ✨ Proposta de Presença Digital
      </div>
      <h1 style="font-size:48px;font-weight:900;line-height:1.08;letter-spacing:-0.033em;color:#fff;margin-top:18px">${esc(data.heroHeadline)}</h1>
      <p style="font-size:16px;line-height:1.68;color:rgba(255,255,255,0.58);margin-top:16px;max-width:438px">${esc(data.heroSubtitle)}</p>
      ${ratingBlock(data)}
    </div>

    <div>
      <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:22px"></div>
      ${ctaBtn(data, ac)}
      <div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:10px">Demonstração gratuita • Sem compromisso • Resposta imediata</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div style="display:flex;flex-direction:column;padding:52px 52px 48px 48px">

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:14px;opacity:.9">Serviços na página</div>
      ${servicesGrid(data.services)}
    </div>

    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:12px;opacity:.9">Diferenciais destacados</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        ${differentialItems(data.differentials, ac)}
      </div>
    </div>

    <div style="font-size:10px;color:rgba(255,255,255,0.17);text-align:right;margin-top:auto;letter-spacing:0.07em">
      PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Template: ADVOGADO ────────────────────────────────────────────────────────

function buildAdvogadoHtml(data: TemplateData): string {
  const ac = data.accentColor; // #c9a84c (gold)
  const bg = data.primaryColor; // #0a0e1a

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:${bg};position:relative}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px);background-size:64px 64px;pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;top:-220px;right:-100px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,${ac}1a 0%,transparent 65%);pointer-events:none;z-index:0}
  </style>
</head>
<body>
<div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%">

  <!-- Gold top bar -->
  <div style="height:3px;background:linear-gradient(90deg,transparent 0%,${ac} 25%,${ac} 75%,transparent 100%);flex-shrink:0"></div>

  <!-- Content -->
  <div style="display:grid;grid-template-columns:56% 44%;flex:1;overflow:hidden">

    <!-- LEFT -->
    <div style="display:flex;flex-direction:column;padding:46px 52px;border-right:1px solid ${ac}22;justify-content:space-between">

      <div>
        <div style="display:flex;align-items:center;gap:16px">
          ${logoHtml(data, 56)}
          <div>
            <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${ac};margin-bottom:5px">Escritório de Advocacia</div>
            <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-0.015em">${esc(data.companyName)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">📍 ${esc(data.city)}</div>
          </div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,${ac}70,transparent);margin-top:28px"></div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:24px 0">
        <h1 style="font-size:44px;font-weight:900;line-height:1.1;letter-spacing:-0.025em;color:#fff;border-left:4px solid ${ac};padding-left:20px">${esc(data.heroHeadline)}</h1>
        <p style="font-size:15px;line-height:1.72;color:rgba(255,255,255,0.52);margin-top:18px;max-width:420px;padding-left:24px">${esc(data.heroSubtitle)}</p>
        ${data.rating || data.reviewCount ? `<div style="padding-left:24px">${ratingBlock(data)}</div>` : ""}
      </div>

      <div>
        <div style="height:1px;background:${ac}28;margin-bottom:22px"></div>
        ${ctaBtn(data, ac, "6px")}
        <div style="font-size:11px;color:rgba(255,255,255,0.28);margin-top:10px">Consulta inicial gratuita • Sigilo garantido</div>
      </div>
    </div>

    <!-- RIGHT -->
    <div style="display:flex;flex-direction:column;padding:46px 48px 46px 44px">

      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${ac};margin-bottom:14px">Áreas de Atuação</div>
        ${servicesList(data.services)}
      </div>

      <div style="margin-top:26px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${ac};margin-bottom:13px">Por que nos escolher</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${differentialItems(data.differentials, ac)}
        </div>
      </div>

      <div style="font-size:10px;color:rgba(255,255,255,0.14);text-align:right;margin-top:auto;letter-spacing:0.09em;font-style:italic">
        PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
      </div>
    </div>
  </div>

  <!-- Gold bottom bar -->
  <div style="height:1px;background:linear-gradient(90deg,transparent 0%,${ac}45 50%,transparent 100%);flex-shrink:0"></div>
</div>
</body>
</html>`;
}

// ── Template: IMÓVEIS ─────────────────────────────────────────────────────────

function buildImoveisHtml(data: TemplateData): string {
  const ac = data.accentColor; // #10b981 (emerald)
  const bg = data.primaryColor; // #0f2027

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:linear-gradient(155deg,${bg} 0%,#081520 50%,#0b1a13 100%);position:relative}
    body::after{content:'';position:fixed;bottom:-160px;right:-100px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,${ac}2a 0%,transparent 65%);pointer-events:none;z-index:0}
    body::before{content:'';position:fixed;top:-200px;left:-80px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,${ac}15 0%,transparent 65%);pointer-events:none;z-index:0}
  </style>
</head>
<body>
<div style="position:relative;z-index:1;display:grid;grid-template-columns:58% 42%;height:100%">

  <!-- LEFT -->
  <div style="display:flex;flex-direction:column;padding:52px 60px;border-right:1px solid rgba(255,255,255,0.07);justify-content:space-between">

    <div style="display:flex;align-items:center;gap:16px">
      ${logoHtml(data, 58)}
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:4px">Imóveis &amp; Corretagem</div>
        <div style="font-size:21px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.01em">${esc(data.companyName)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.42);margin-top:4px">📍 ${esc(data.city)}</div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:24px 0">
      <div style="display:inline-flex;align-items:center;gap:7px;background:${ac}18;border:1px solid ${ac}38;color:${ac};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:6px 14px;border-radius:100px;width:fit-content;margin-bottom:18px">
        🏠 Proposta de Presença Digital
      </div>
      <h1 style="font-size:50px;font-weight:900;line-height:1.04;letter-spacing:-0.036em;color:#fff">${esc(data.heroHeadline)}</h1>
      <p style="font-size:16px;line-height:1.68;color:rgba(255,255,255,0.52);margin-top:16px;max-width:455px">${esc(data.heroSubtitle)}</p>
    </div>

    <div>
      ${data.reviewCount ? `
      <div style="display:flex;gap:36px;margin-bottom:20px">
        <div>
          <div style="font-size:36px;font-weight:900;color:${ac};line-height:1;letter-spacing:-0.03em">${data.reviewCount}+</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px">Avaliações no Google</div>
        </div>
        ${data.rating ? `
        <div>
          <div style="font-size:36px;font-weight:900;color:#fff;line-height:1;letter-spacing:-0.03em">${data.rating.toFixed(1)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px">Nota média</div>
        </div>` : ""}
        <div>
          <div style="font-size:36px;font-weight:900;color:rgba(255,255,255,0.6);line-height:1;letter-spacing:-0.03em">100%</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px">Digital e profissional</div>
        </div>
      </div>` : `${ratingBlock(data)}<div style="height:16px"></div>`}
      <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:22px"></div>
      ${ctaBtn(data, ac)}
      <div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:10px">Apresentação gratuita • Sem compromisso</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div style="display:flex;flex-direction:column;padding:52px 52px 48px 44px">

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:14px;opacity:.9">Tipos de Imóveis</div>
      ${servicesList(data.services)}
    </div>

    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:12px;opacity:.9">Nossos Diferenciais</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${differentialItems(data.differentials, ac)}
      </div>
    </div>

    <div style="font-size:10px;color:rgba(255,255,255,0.17);text-align:right;margin-top:auto;letter-spacing:0.07em">
      PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Template: SERVIÇOS ────────────────────────────────────────────────────────

function buildServicosHtml(data: TemplateData): string {
  const ac = data.accentColor; // #3b82f6 (blue) or #f97316 (orange) depending on niche
  const bg = data.primaryColor; // #0a1628

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:${bg};position:relative}
    body::before{content:'';position:fixed;top:-180px;right:-80px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,${ac}30 0%,transparent 65%);pointer-events:none;z-index:0}
    /* Accent left stripe */
    body::after{content:'';position:fixed;top:0;left:0;width:5px;height:100%;background:linear-gradient(to bottom,${ac},${ac}70,transparent);pointer-events:none;z-index:1}
  </style>
</head>
<body>
<div style="position:relative;z-index:2;display:grid;grid-template-columns:50% 50%;height:100%">

  <!-- LEFT -->
  <div style="display:flex;flex-direction:column;padding:52px 52px 52px 62px;border-right:1px solid rgba(255,255,255,0.07);justify-content:space-between">

    <div style="display:flex;align-items:center;gap:14px">
      ${logoHtml(data, 56)}
      <div>
        <div style="font-size:19px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.01em">${esc(data.companyName)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.42);margin-top:4px">📍 ${esc(data.city)}</div>
      </div>
    </div>

    <div style="display:inline-flex;align-items:center;gap:8px;background:${ac}1c;border:1px solid ${ac}42;color:${ac};font-size:11px;font-weight:700;letter-spacing:0.06em;padding:7px 16px;border-radius:8px;width:fit-content">
      ⚡ Atendimento Rápido em ${esc(data.city)}
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:8px 0">
      <h1 style="font-size:52px;font-weight:900;line-height:1.0;letter-spacing:-0.036em;color:#fff">${esc(data.heroHeadline)}</h1>
      <p style="font-size:16px;line-height:1.65;color:rgba(255,255,255,0.58);margin-top:14px;max-width:418px">${esc(data.heroSubtitle)}</p>
      ${ratingBlock(data)}
    </div>

    <div>
      <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:22px"></div>
      ${ctaBtn(data, ac)}
      <div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:10px">Orçamento gratuito • Sem compromisso</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div style="display:flex;flex-direction:column;padding:52px 56px 48px 48px">

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:14px;opacity:.9">Serviços na página</div>
      ${servicesGrid(data.services)}
    </div>

    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:12px;opacity:.9">Por que nos contratar</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        ${differentialItems(data.differentials, ac)}
      </div>
    </div>

    <div style="font-size:10px;color:rgba(255,255,255,0.17);text-align:right;margin-top:auto;letter-spacing:0.07em">
      PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Template: COMÉRCIO LOCAL ──────────────────────────────────────────────────

function buildComercioHtml(data: TemplateData): string {
  const ac = data.accentColor; // #f59e0b (amber)
  const bg = data.primaryColor; // #0f1923

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:${bg};position:relative}
    body::before{content:'';position:fixed;top:-200px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,${ac}26 0%,transparent 65%);pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;bottom:-140px;left:-60px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,${ac}14 0%,transparent 65%);pointer-events:none;z-index:0}
  </style>
</head>
<body>
<div style="position:relative;z-index:1;display:grid;grid-template-columns:55% 45%;height:100%">

  <!-- LEFT -->
  <div style="display:flex;flex-direction:column;padding:52px 56px;border-right:1px solid rgba(255,255,255,0.07);justify-content:space-between">

    <div style="display:flex;align-items:center;gap:16px">
      ${logoHtml(data, 60)}
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:4px">Comércio Local</div>
        <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.01em">${esc(data.companyName)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.44);margin-top:4px">📍 ${esc(data.city)}</div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:22px 0">
      <div style="display:inline-flex;align-items:center;gap:7px;background:${ac}1c;border:1px solid ${ac}42;color:${ac};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:6px 14px;border-radius:100px;width:fit-content;margin-bottom:18px">
        🏪 Referência em ${esc(data.city)}
      </div>
      <h1 style="font-size:46px;font-weight:900;line-height:1.08;letter-spacing:-0.03em;color:#fff">${esc(data.heroHeadline)}</h1>
      <p style="font-size:16px;line-height:1.65;color:rgba(255,255,255,0.56);margin-top:14px;max-width:438px">${esc(data.heroSubtitle)}</p>
      ${ratingBlock(data)}
    </div>

    <div>
      <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:22px"></div>
      ${ctaBtn(data, ac)}
      <div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:10px">Peça pelo WhatsApp • Atendimento local</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div style="display:flex;flex-direction:column;padding:52px 52px 48px 48px">

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:14px;opacity:.9">Categorias na página</div>
      ${servicesGrid(data.services)}
    </div>

    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:12px;opacity:.9">Por que comprar conosco</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        ${differentialItems(data.differentials, ac)}
      </div>
    </div>

    <div style="font-size:10px;color:rgba(255,255,255,0.17);text-align:right;margin-top:auto;letter-spacing:0.07em">
      PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Template: OUTROS (fallback) ────────────────────────────────────────────────

function buildOutrosHtml(data: TemplateData): string {
  const ac = data.accentColor; // #6366f1 (indigo)
  const bg = data.primaryColor; // #111827

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Presença Digital — ${esc(data.companyName)}</title>
  ${FONT_LINK}
  <style>
    ${BASE_CSS}
    body{background:linear-gradient(140deg,${bg} 0%,#0d1117 58%,${ac}12 100%);position:relative}
    body::before{content:'';position:fixed;top:-230px;right:-110px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,${ac}30 0%,transparent 65%);pointer-events:none;z-index:0}
  </style>
</head>
<body>
<div style="position:relative;z-index:1;display:grid;grid-template-columns:55% 45%;height:100%">

  <!-- LEFT -->
  <div style="display:flex;flex-direction:column;padding:52px 56px;border-right:1px solid rgba(255,255,255,0.07);justify-content:space-between">

    <div style="display:flex;align-items:center;gap:16px">
      ${logoHtml(data, 60)}
      <div>
        <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.01em">${esc(data.companyName)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.44);margin-top:4px">📍 ${esc(data.city)}</div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:28px 0">
      <div style="display:inline-flex;align-items:center;gap:7px;background:${ac}1c;border:1px solid ${ac}40;color:${ac};font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;padding:6px 14px;border-radius:100px;width:fit-content">
        ✨ Proposta de Presença Digital
      </div>
      <h1 style="font-size:46px;font-weight:900;line-height:1.08;letter-spacing:-0.033em;color:#fff;margin-top:18px">${esc(data.heroHeadline)}</h1>
      <p style="font-size:16px;line-height:1.68;color:rgba(255,255,255,0.56);margin-top:16px;max-width:438px">${esc(data.heroSubtitle)}</p>
      ${ratingBlock(data)}
    </div>

    <div>
      <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:22px"></div>
      ${ctaBtn(data, ac)}
      <div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:10px">Demonstração gratuita • Sem compromisso</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div style="display:flex;flex-direction:column;padding:52px 52px 48px 48px">

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:14px;opacity:.9">Serviços na página</div>
      ${servicesGrid(data.services)}
    </div>

    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${ac};margin-bottom:12px;opacity:.9">Diferenciais</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        ${differentialItems(data.differentials, ac)}
      </div>
    </div>

    <div style="font-size:10px;color:rgba(255,255,255,0.17);text-align:right;margin-top:auto;letter-spacing:0.07em">
      PROPOSTA EXCLUSIVA · ${esc(data.companyName.toUpperCase())}
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Router ────────────────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<Niche, (data: TemplateData) => string> = {
  clinica: buildClinicaHtml,
  advogado: buildAdvogadoHtml,
  imoveis: buildImoveisHtml,
  servicos: buildServicosHtml,
  comercio: buildComercioHtml,
  automoveis: buildComercioHtml,
  outros: buildOutrosHtml,
};

// ── Public API (signature unchanged — called by pipeline.worker.ts) ───────────

export async function renderScopePage(data: TemplateData): Promise<string> {
  const renderer = TEMPLATE_MAP[data.niche] ?? buildOutrosHtml;
  const html = renderer(data);

  await fs.mkdir(config.paths.pages, { recursive: true });

  const filename = `scope-${sanitizeFilename(data.companyName)}-${Date.now()}.html`;
  const filePath = path.join(config.paths.pages, filename);
  await fs.writeFile(filePath, html, "utf-8");

  log.info({ company: data.companyName, niche: data.niche, file: filename }, "Página de escopo renderizada");
  return path.resolve(filePath);
}
