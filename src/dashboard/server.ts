import express, { type Request, type Response, type NextFunction } from "express";
import { type Server } from "http";
import { resolve as resolvePath } from "path";
import { desc } from "drizzle-orm";
import { db } from "../database/client.js";
import { leads, type Lead } from "../database/schema.js";
import { leadRepository } from "../database/repositories/lead.repository.js";
import { getQueueStats, pipelineQueue, getDispatchFailedJobs, enqueueScrapeJobs } from "../modules/queue/queue-manager.js";
import { getNicheQueries } from "../modules/scraper/google-maps.scraper.js";
import { metricsRegistry, updatePrometheusMetrics } from "../metrics/index.js";
import { createModuleLogger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { getDispatchStatus, setManualOverride } from "../modules/dispatch-schedule.js";
import { dispatchRepository } from "../database/repositories/dispatch.repository.js";

const log = createModuleLogger("dashboard");

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  scraped: "Coletado",
  validated: "Validado",
  scored: "Pontuado",
  page_generated: "Página Gerada",
  screenshot_ready: "Pronto p/ Envio",
  dispatched: "Enviado",
  replied: "Respondeu",
  disqualified: "Descartado",
};

const STATUS_COLORS: Record<string, string> = {
  scraped: "#64748b",
  validated: "#3b82f6",
  scored: "#8b5cf6",
  page_generated: "#f59e0b",
  screenshot_ready: "#10b981",
  dispatched: "#06b6d4",
  replied: "#22c55e",
  disqualified: "#ef4444",
};

const NICHE_ICONS: Record<string, string> = {
  oficina: "🔧",
  clinica: "🏥",
  restaurante: "🍽️",
  academia: "💪",
  imoveis: "🏠",
  estetica: "✂️",
  loja: "🛍️",
  servicos: "⚙️",
  outros: "📦",
};

const PIPELINE_STAGES = [
  "scraped",
  "validated",
  "scored",
  "page_generated",
  "screenshot_ready",
  "dispatched",
  "replied",
] as const;

// ── Auth middleware ───────────────────────────────────────────────────────────

function basicAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.app.dashboardPassword) {
    next();
    return;
  }

  // req.headers values can be string | string[] — normalize to string | undefined
  const rawAuth = req.headers["authorization"];
  const authHeader = typeof rawAuth === "string" ? rawAuth : undefined;

  if (!authHeader?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Prospector Dashboard", charset="UTF-8"');
    res.status(401).send("Autenticação necessária");
    return;
  }

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const colonIdx = decoded.indexOf(":");
  const user = colonIdx >= 0 ? decoded.slice(0, colonIdx) : decoded;
  const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : "";

  if (user !== config.app.dashboardUser || pass !== config.app.dashboardPassword) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Prospector Dashboard", charset="UTF-8"');
    res.status(401).send("Credenciais inválidas");
    return;
  }

  next();
}

// ── Stats cache ───────────────────────────────────────────────────────────────
// Prevents hammering the DB with 3 queries per connected SSE client every 3 seconds.

interface StatsSnapshot {
  dbStats: Record<string, number>;
  queueStats: Awaited<ReturnType<typeof getQueueStats>>;
  recentLeads: Lead[];
  failedDispatches: Awaited<ReturnType<typeof dispatchRepository.getRecentFailed>>;
  dispatchQueueFailures: Awaited<ReturnType<typeof getDispatchFailedJobs>>;
  total: number;
  timestamp: number;
}

let _cachedStats: StatsSnapshot | null = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 1_500;

async function getStats(): Promise<StatsSnapshot> {
  if (_cachedStats !== null && Date.now() < _cacheExpiresAt) return _cachedStats;

  const [dbStats, queueStats, recentLeads, failedDispatches, dispatchQueueFailures] = await Promise.all([
    leadRepository.countByStatus(),
    getQueueStats(),
    db.select().from(leads).orderBy(desc(leads.updatedAt)).limit(50),
    dispatchRepository.getRecentFailed(10),
    getDispatchFailedJobs(10),
  ]);

  const total = Object.values(dbStats).reduce((a, b) => a + b, 0);

  _cachedStats = { dbStats, queueStats, recentLeads, failedDispatches, dispatchQueueFailures, total, timestamp: Date.now() };
  _cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  return _cachedStats;
}

// ── HTML template ─────────────────────────────────────────────────────────────

function getDashboardHtml(): string {
  const statusLabelsJson = JSON.stringify(STATUS_LABELS);
  const statusColorsJson = JSON.stringify(STATUS_COLORS);
  const nicheIconsJson   = JSON.stringify(NICHE_ICONS);
  const pipelineStagesJson = JSON.stringify(PIPELINE_STAGES);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prospector — Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --bg: #070c16;
      --surface: #0d1424;
      --surface-2: #131d30;
      --border: rgba(255,255,255,0.07);
      --border-hover: rgba(255,255,255,0.12);
      --text-primary: #e8edf5;
      --text-secondary: #7d8ea6;
      --text-muted: #3d4f66;
    }
    body { background: var(--bg); font-family: 'Inter', system-ui, sans-serif; color: var(--text-primary); min-height: 100vh; }
    .glass { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.2px; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 0 rgba(34,197,94,0.4); animation: live-pulse 2s cubic-bezier(0.66,0,0,1) infinite; }
    .live-dot.off { background: #ef4444; animation: none; box-shadow: none; }
    @keyframes live-pulse { to { box-shadow: 0 0 0 8px rgba(34,197,94,0); } }
    .stat-value { font-size: 2.25rem; font-weight: 800; line-height: 1; letter-spacing: -0.03em; }
    .score-bar { height: 4px; border-radius: 2px; overflow: hidden; background: rgba(255,255,255,0.06); }
    .score-fill { height: 100%; border-radius: 2px; }
    .funnel-stage { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 68px; }
    .funnel-label { font-size: 10px; font-weight: 500; color: var(--text-secondary); text-align: center; line-height: 1.3; }
    .funnel-pct { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; }
    .funnel-arrow { color: var(--text-muted); font-size: 14px; padding-top: 14px; }
    .table-row { transition: background 0.1s ease; }
    .table-row:hover { background: rgba(255,255,255,0.025); }
    .niche-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
    .retry-btn { cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 500; transition: all 0.15s; }
    .retry-btn:hover { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
    .retry-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .dispatch-btn { cursor: pointer; border: none; border-radius: 8px; padding: 7px 16px; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.15s; letter-spacing: 0.1px; }
    .dispatch-btn.active { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; }
    .dispatch-btn.active:hover { background: rgba(34,197,94,0.25); }
    .dispatch-btn.inactive { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; }
    .dispatch-btn.inactive:hover { background: rgba(239,68,68,0.25); }
    .window-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    @keyframes value-flash { 0% { opacity: 0.5; transform: translateY(-3px); } 100% { opacity: 1; transform: translateY(0); } }
    .value-changed { animation: value-flash 0.25s ease forwards; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    @media (max-width: 768px) { .hide-mobile { display: none !important; } }
    /* Toast */
    #toast-container { position: fixed; top: 18px; right: 18px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    .toast { pointer-events: auto; background: #0d1424; border: 1px solid rgba(34,197,94,0.35); border-radius: 12px; padding: 12px 16px; min-width: 260px; max-width: 340px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; gap: 10px; align-items: flex-start; animation: toast-in 0.3s ease; }
    .toast.error { border-color: rgba(239,68,68,0.35); }
    @keyframes toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes toast-out { to { opacity: 0; transform: translateX(20px); } }
    .toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .toast-body { flex: 1; min-width: 0; }
    .toast-title { font-size: 12px; font-weight: 700; color: #e8edf5; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .toast-sub { font-size: 11px; color: #7d8ea6; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="toast-container"></div>
  <div class="max-w-screen-xl mx-auto px-4 py-6 space-y-4">

    <!-- Header -->
    <div class="glass px-5 py-4 flex items-center justify-between gap-4"
         style="background:linear-gradient(135deg,rgba(99,102,241,0.1) 0%,var(--surface) 60%)">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
             style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">🎯</div>
        <div>
          <h1 class="text-base font-bold text-white leading-none">Prospector Automatizado</h1>
          <p class="text-xs mt-0.5" style="color:var(--text-secondary)">Dashboard de Monitoramento em Tempo Real</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button id="scrape-btn" onclick="startScraping()"
          class="dispatch-btn inactive"
          style="background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.4);color:#a5b4fc;font-size:12px">
          🔍 Iniciar Scraping
        </button>
        <div class="flex items-center gap-2">
          <div class="live-dot off" id="live-dot"></div>
          <span class="text-xs font-medium" style="color:var(--text-secondary)" id="live-text">Conectando...</span>
        </div>
        <span class="text-xs hide-mobile" style="color:var(--text-muted)" id="last-update"></span>
      </div>
    </div>

    <!-- Dispatch Control -->
    <div class="glass px-5 py-4 flex flex-wrap items-center justify-between gap-4"
         id="dispatch-control" style="background:linear-gradient(135deg,rgba(34,197,94,0.06) 0%,var(--surface) 60%)">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-white">Janela de Disparo</span>
          <span id="window-badge" class="window-badge" style="background:rgba(100,116,139,0.15);color:#64748b">
            <span id="window-dot" style="width:6px;height:6px;border-radius:50%;background:#64748b;display:inline-block"></span>
            <span id="window-label">Carregando...</span>
          </span>
        </div>
        <span id="window-info" class="text-xs" style="color:var(--text-muted)"></span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs" style="color:var(--text-muted)" id="override-info"></span>
        <button id="dispatch-toggle-btn" class="dispatch-btn inactive" onclick="toggleDispatch()">
          ⏳ Carregando...
        </button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('')" title="Ver todos">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Total</p>
        <p class="stat-value text-white" id="s-total">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">leads coletados</p>
      </div>
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('screenshot_ready')" title="Ver qualificados"
           style="background:linear-gradient(135deg,rgba(99,102,241,0.08) 0%,var(--surface) 70%);border-color:rgba(99,102,241,0.2)">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:#6366f1">Qualificados</p>
        <p class="stat-value" style="color:#818cf8" id="s-qualified">—</p>
        <p class="text-xs" id="s-qual-rate" style="color:var(--text-secondary)">taxa de qualificação</p>
      </div>
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('screenshot_ready')" title="Ver prontos para envio">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Fila de Envio</p>
        <p class="stat-value" style="color:#10b981" id="s-ready">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">prontos para disparar</p>
      </div>
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('dispatched')" title="Ver enviados">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Enviados</p>
        <p class="stat-value" style="color:#06b6d4" id="s-dispatched">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">mensagens disparadas</p>
      </div>
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('replied')" title="Ver respostas">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Responderam</p>
        <p class="stat-value" style="color:#22c55e" id="s-replied">—</p>
        <p class="text-xs" id="s-reply-rate" style="color:var(--text-secondary)">taxa de resposta</p>
      </div>
      <div class="glass p-4 space-y-1.5 cursor-pointer" onclick="setKpiFilter('disqualified')" title="Ver descartados">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Descartados</p>
        <p class="stat-value" style="color:#64748b" id="s-disqualified">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">sem site ou score baixo</p>
      </div>
    </div>

    <!-- Pipeline Funnel + Queue Stats -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <div class="glass p-5 lg:col-span-3">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xs font-semibold uppercase tracking-widest" style="color:var(--text-secondary)">Funil do Pipeline</h2>
          <span class="text-xs px-2 py-0.5 rounded" style="color:var(--text-muted);background:rgba(255,255,255,0.04)">coleta → disparo</span>
        </div>
        <div id="pipeline-funnel" class="flex flex-wrap items-start gap-0.5 justify-between"></div>
      </div>
      <div class="glass p-5 lg:col-span-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest mb-4" style="color:var(--text-secondary)">Filas de Processamento</h2>
        <div class="space-y-0" id="queue-stats"></div>
        <div class="mt-4 pt-3 border-t flex gap-6 text-xs" style="border-color:var(--border)">
          <span style="color:#f59e0b">● Aguard.</span>
          <span style="color:#6366f1">● Ativo</span>
          <span style="color:#22c55e">● Concluído</span>
          <span style="color:#ef4444">● Falhou</span>
        </div>
      </div>
    </div>

    <!-- Leads Table -->
    <div class="glass p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="text-xs font-semibold uppercase tracking-widest" style="color:var(--text-secondary)">Leads Recentes</h2>
        <div class="flex items-center gap-2">
          <select id="filter-status" class="text-xs px-2 py-1 rounded border outline-none"
                  style="background:var(--surface-2);border-color:var(--border);color:var(--text-secondary)">
            <option value="">Todos os status</option>
            <option value="scraped">Coletado</option>
            <option value="validated">Validado</option>
            <option value="scored">Pontuado</option>
            <option value="screenshot_ready">Pronto p/ Envio</option>
            <option value="dispatched">Enviado</option>
            <option value="replied">Respondeu</option>
            <option value="disqualified">Descartado</option>
          </select>
          <span class="text-xs" style="color:var(--text-muted)" id="leads-count"></span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width:680px">
          <thead>
            <tr class="text-left border-b" style="border-color:var(--border)">
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Empresa</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider hide-mobile" style="color:var(--text-muted)">Cidade</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Nicho</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-right" style="color:var(--text-muted)">Score</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Status</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider hide-mobile" style="color:var(--text-muted)">Coletado em</th>
              <th class="pb-3 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Ação</th>
            </tr>
          </thead>
          <tbody id="leads-table"></tbody>
        </table>
      </div>
      <div id="leads-empty" class="hidden text-center py-12">
        <p class="text-4xl mb-2">🔍</p>
        <p class="text-sm font-medium" style="color:var(--text-secondary)">Nenhum lead encontrado</p>
        <p class="text-xs mt-1" style="color:var(--text-muted)">Inicie o sistema para começar a prospecção</p>
      </div>
    </div>

    <!-- Modal de detalhes do lead -->
    <div id="lead-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);padding:24px;overflow-y:auto" onclick="if(event.target===this)closeLead()">
      <div class="glass" style="max-width:680px;margin:0 auto;padding:0;overflow:hidden">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:between;gap:12px">
          <div style="flex:1;min-width:0">
            <div id="modal-name" class="text-lg font-bold text-white leading-tight"></div>
            <div id="modal-meta" class="text-xs mt-1" style="color:var(--text-secondary)"></div>
          </div>
          <button onclick="closeLead()" style="background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;flex-shrink:0">✕ Fechar</button>
        </div>
        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px" id="modal-stats"></div>
        <div style="padding:0 24px 24px">
          <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted)">Preview da Landing Page</p>
          <div id="modal-preview" style="border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--surface-2);min-height:200px;display:flex;align-items:center;justify-content:center">
            <span style="color:var(--text-muted);font-size:13px">Carregando...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Falhas de Disparo -->
    <div class="glass p-5" id="failures-section" style="display:none">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-base">⚠️</span>
        <h2 class="text-xs font-semibold uppercase tracking-widest" style="color:#ef4444">Falhas de Disparo</h2>
        <span id="failures-count" class="badge" style="background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.2)"></span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width:560px">
          <thead>
            <tr class="text-left border-b" style="border-color:var(--border)">
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Telefone</th>
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Tentativa</th>
              <th class="pb-3 text-xs font-medium uppercase tracking-wider" style="color:var(--text-muted)">Motivo da Falha</th>
            </tr>
          </thead>
          <tbody id="failures-table"></tbody>
        </table>
      </div>
    </div>

  </div>

<script>
(function() {
'use strict';
const STATUS_LABELS = ${statusLabelsJson};
const STATUS_COLORS = ${statusColorsJson};
const NICHE_ICONS   = ${nicheIconsJson};
const PIPELINE_STAGES = ${pipelineStagesJson};

const NICHE_COLORS = {
  oficina:'#f97316', clinica:'#0ea5e9', restaurante:'#dc2626',
  academia:'#eab308', imoveis:'#10b981', estetica:'#ec4899',
  loja:'#a78bfa', servicos:'#94a3b8', outros:'#64748b',
};

const RETRYABLE = new Set(['scraped','validated','scored','page_generated','screenshot_ready','disqualified']);

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return d + 's';
  if (d < 3600) return Math.floor(d/60) + 'min';
  if (d < 86400) return Math.floor(d/3600) + 'h';
  return Math.floor(d/86400) + 'd';
}
function pct(a,b) { return b > 0 ? Math.round((a/b)*100) : 0; }
function setVal(id, v) {
  const el = document.getElementById(id);
  if (!el || el.textContent === String(v)) return;
  el.textContent = v;
  el.classList.remove('value-changed');
  void el.offsetWidth;
  el.classList.add('value-changed');
}
function statusBadge(s) {
  const c = STATUS_COLORS[s]||'#64748b', l = STATUS_LABELS[s]||s;
  return \`<span class="badge" style="background:\${c}1a;color:\${c};border:1px solid \${c}30">\${l}</span>\`;
}
function nicheBadge(n) {
  if (!n) return '<span style="color:var(--text-muted)">—</span>';
  const c = NICHE_COLORS[n]||'#64748b', i = NICHE_ICONS[n]||'📦';
  return \`<span class="niche-chip" style="background:\${c}18;color:\${c}">\${i} \${n}</span>\`;
}
function scoreBar(v) {
  if (v == null) return '<span style="color:var(--text-muted)">—</span>';
  const p = Math.min(100,Math.max(0,Math.round(v)));
  const c = p>=70?'#22c55e':p>=50?'#10b981':p>=30?'#f59e0b':'#94a3b8';
  return \`<div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
    <span style="color:\${c};font-size:11px;font-weight:700;font-family:monospace;min-width:22px;text-align:right">\${p}</span>
    <div class="score-bar" style="width:48px"><div class="score-fill" style="width:\${p}%;background:\${c}"></div></div>
  </div>\`;
}

// ── Scraping manual ──────────────────────────────────────────────────────
function startScraping() {
  const btn = document.getElementById('scrape-btn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '⏳ Enfileirando...';
  fetch('/api/scrape/start', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        btn.textContent = '✅ ' + d.jobsEnqueued + ' jobs';
        showToast('🔍', 'Scraping iniciado', d.jobsEnqueued + ' queries enfileiradas', false);
      } else {
        btn.textContent = '❌ Erro';
      }
      setTimeout(() => { btn.textContent = '🔍 Iniciar Scraping'; btn.disabled = false; }, 4000);
    })
    .catch(() => {
      btn.textContent = '❌ Erro';
      setTimeout(() => { btn.textContent = '🔍 Iniciar Scraping'; btn.disabled = false; }, 3000);
    });
}
window.startScraping = startScraping;

// ── Modal de detalhes do lead ─────────────────────────────────────────────
function openLead(id) {
  const modal = document.getElementById('lead-modal');
  if (!modal) return;
  modal.style.display = '';
  document.getElementById('modal-name').textContent = 'Carregando...';
  document.getElementById('modal-meta').textContent = '';
  document.getElementById('modal-stats').innerHTML = '';
  document.getElementById('modal-preview').innerHTML = '<span style="color:var(--text-muted);font-size:13px">Carregando...</span>';
  fetch('/api/leads/' + id)
    .then(r => r.json())
    .then(l => {
      const nicheIcon = NICHE_ICONS[l.niche] || '📦';
      document.getElementById('modal-name').textContent = l.name;
      document.getElementById('modal-meta').textContent =
        (l.city || '') + (l.niche ? '  ·  ' + nicheIcon + ' ' + l.niche : '') +
        (l.score != null ? '  ·  Score ' + Math.round(l.score) : '');
      const items = [
        ['📞 Telefone', l.phone || l.whatsapp || '—'],
        ['🏙️ Cidade', l.city || '—'],
        [nicheIcon + ' Nicho', l.niche || '—'],
        ['⭐ Rating', l.rating ? l.rating + ' (' + (l.reviewCount || 0) + ' avaliações)' : '—'],
        ['📊 Score', l.score != null ? Math.round(l.score) + ' / 100' : '—'],
        ['📅 Coletado', fmtDate(l.scrapedAt)],
        ['📌 Status', STATUS_LABELS[l.status] || l.status],
        ['🔗 Instagram', l.instagram ? '@' + (l.instagram.split('/').filter(Boolean).pop() || '—') : '—'],
      ];
      document.getElementById('modal-stats').innerHTML = items.map(([k,v]) =>
        \`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
          <div class="text-xs" style="color:var(--text-muted)">\${k}</div>
          <div class="text-sm font-medium text-white mt-0.5" style="word-break:break-all">\${esc(String(v))}</div>
        </div>\`
      ).join('');
      const preview = document.getElementById('modal-preview');
      if (l.screenshotPath) {
        preview.innerHTML = \`<img src="/api/leads/\${l.id}/screenshot" style="width:100%;display:block" alt="Landing page" onerror="this.parentNode.innerHTML='<span style=\\'color:var(--text-muted);font-size:13px;padding:20px\\'>Imagem não disponível</span>'">\`;
      } else {
        preview.innerHTML = '<span style="color:var(--text-muted);font-size:13px;padding:20px">Screenshot ainda não gerado</span>';
      }
    })
    .catch(() => { document.getElementById('modal-name').textContent = 'Erro ao carregar'; });
}
function closeLead() {
  const modal = document.getElementById('lead-modal');
  if (modal) modal.style.display = 'none';
}
window.openLead = openLead;
window.closeLead = closeLead;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLead(); });

// ── KPIs clicáveis (filtram tabela) ──────────────────────────────────────
function setKpiFilter(status) {
  const sel = document.getElementById('filter-status');
  if (!sel) return;
  sel.value = status;
  filterLeads();
  document.getElementById('leads-table')?.closest('.glass')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.setKpiFilter = setKpiFilter;

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(icon, title, sub, isError) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.innerHTML = \`<div class="toast-icon">\${icon}</div>
    <div class="toast-body">
      <div class="toast-title">\${esc(title)}</div>
      \${sub ? \`<div class="toast-sub">\${esc(sub)}</div>\` : ''}
    </div>\`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 6000);
}

// Detecta novos leads screenshot_ready comparando com tick anterior
let _prevReadyIds = new Set();
function detectNewQualified(leads) {
  const current = leads.filter(l => l.status === 'screenshot_ready');
  const currentIds = new Set(current.map(l => l.id));
  current.forEach(l => {
    if (!_prevReadyIds.has(l.id)) {
      const nicheIcon = NICHE_ICONS[l.niche] || '📦';
      const score = l.score ? ' · score ' + Math.round(l.score) : '';
      showToast(nicheIcon, l.name, (l.city || '') + (l.niche ? ' · ' + l.niche : '') + score, false);
    }
  });
  _prevReadyIds = currentIds;
}

// ── Falhas de disparo ─────────────────────────────────────────────────────
function renderFailures(data) {
  // Combina falhas do banco (pós-tentativa) + falhas BullMQ (pré-tentativa)
  const dbFails = (data.failedDispatches || []).map(f => ({
    who: f.whatsapp,
    when: f.sentAt,
    reason: f.errorMessage || 'Erro desconhecido',
  }));
  const qFails = (data.dispatchQueueFailures || []).map(f => ({
    who: f.companyName + ' (' + f.whatsapp + ')',
    when: f.failedAt,
    reason: f.reason,
  }));
  // Remove duplicatas simples (mesma reason + who)
  const seen = new Set();
  const all = [...dbFails, ...qFails].filter(f => {
    const k = f.who + '|' + f.reason;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  const section = document.getElementById('failures-section');
  const tbody   = document.getElementById('failures-table');
  const badge   = document.getElementById('failures-count');
  if (!section || !tbody) return;
  if (!all.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  if (badge) badge.textContent = all.length + ' falha' + (all.length !== 1 ? 's' : '');
  tbody.innerHTML = all.map(f => \`<tr class="table-row border-b" style="border-color:rgba(255,255,255,0.04)">
    <td class="py-3 pr-4"><span class="text-xs font-mono" style="color:var(--text-secondary)">\${esc(f.who)}</span></td>
    <td class="py-3 pr-4"><span class="text-xs font-mono" style="color:var(--text-muted)">\${fmtDate(f.when)}</span></td>
    <td class="py-3"><span class="text-xs px-2 py-1 rounded" style="background:rgba(239,68,68,0.1);color:#ef4444">\${esc(f.reason)}</span></td>
  </tr>\`).join('');
}

// ── Dispatch control ──────────────────────────────────────────────────────
let _dispatchStatus = null;

function renderDispatchControl(s) {
  _dispatchStatus = s;
  const btn    = document.getElementById('dispatch-toggle-btn');
  const badge  = document.getElementById('window-badge');
  const dot    = document.getElementById('window-dot');
  const label  = document.getElementById('window-label');
  const info   = document.getElementById('window-info');
  const ovInfo = document.getElementById('override-info');
  if (!btn || !badge || !dot || !label) return;

  const active = s.canDispatch;

  // Janela badge
  if (s.withinWindow) {
    badge.style.background = 'rgba(34,197,94,0.12)';
    badge.style.color = '#22c55e';
    dot.style.background = '#22c55e';
    label.textContent = '08:00 – 18:00 ativa';
  } else {
    badge.style.background = 'rgba(100,116,139,0.12)';
    badge.style.color = '#64748b';
    dot.style.background = '#64748b';
    label.textContent = 'Fora da janela';
  }

  if (info) info.textContent = s.withinWindow
    ? 'Horário: ' + s.currentHourBRT + ':xx BRT'
    : (s.nextWindowOpen ? 'Abre às ' + s.nextWindowOpen : '');

  // Override info
  if (ovInfo) ovInfo.textContent = s.manualOverride ? '🔓 override manual ativo' : '';

  // Button
  btn.className = 'dispatch-btn ' + (active ? 'active' : 'inactive');
  btn.textContent = s.manualOverride
    ? '🛑 Pausar Disparo'
    : (s.withinWindow ? '✅ Dentro da Janela' : '🚀 Disparar Agora');
  btn.disabled = s.withinWindow && !s.manualOverride; // botão só ativo fora da janela ou em override
  if (s.withinWindow && !s.manualOverride) {
    btn.style.opacity = '0.5';
    btn.style.cursor = 'default';
  } else {
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

function toggleDispatch() {
  const newEnabled = _dispatchStatus ? !_dispatchStatus.manualOverride : true;
  fetch('/api/dispatch/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: newEnabled }),
  })
    .then(r => r.json())
    .then(d => renderDispatchControl(d))
    .catch(console.error);
}
window.toggleDispatch = toggleDispatch;

function fetchDispatchStatus() {
  fetch('/api/dispatch/status')
    .then(r => r.json())
    .then(d => renderDispatchControl(d))
    .catch(console.error);
}

// Atualiza status de disparo a cada 30s
setInterval(fetchDispatchStatus, 30_000);
fetchDispatchStatus();

// ── Retry ──────────────────────────────────────────────────────────────────
function retryLead(id) {
  const btn = document.querySelector('[data-retry="' + id + '"]');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '...';
  fetch('/api/leads/' + id + '/retry', { method: 'POST' })
    .then(r => r.json())
    .then(d => { btn.textContent = d.ok ? '✓' : '✗'; btn.style.color = d.ok ? '#22c55e' : '#ef4444'; })
    .catch(() => { btn.textContent = '✗'; btn.style.color = '#ef4444'; btn.disabled = false; });
}
window.retryLead = retryLead;

// ── Render ──────────────────────────────────────────────────────────────────
function renderCards(data) {
  const dispatched  = data.dbStats.dispatched       || 0;
  const replied     = data.dbStats.replied          || 0;
  const ready       = data.dbStats.screenshot_ready || 0;
  // Qualificados = todos que passaram pela pipeline completa
  const qualified   = ready + dispatched + replied;
  const disqualified = data.dbStats.disqualified    || 0;
  const scraped     = data.total;
  setVal('s-total',        scraped);
  setVal('s-qualified',    qualified);
  setVal('s-ready',        ready);
  setVal('s-dispatched',   dispatched);
  setVal('s-replied',      replied);
  setVal('s-disqualified', disqualified);
  const qr = document.getElementById('s-qual-rate');
  if (qr) qr.textContent = scraped > 0 ? pct(qualified, scraped) + '% dos coletados' : 'sem dados';
  const rr = document.getElementById('s-reply-rate');
  if (rr) rr.textContent = dispatched > 0 ? pct(replied, dispatched) + '% conversão' : 'aguardando envios';
}

function renderFunnel(data) {
  const el = document.getElementById('pipeline-funnel');
  if (!el) return;
  const parts = [];
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    const s = PIPELINE_STAGES[i];
    const count = data.dbStats[s] || 0;
    const prev = i > 0 ? (data.dbStats[PIPELINE_STAGES[i-1]] || 0) : data.total;
    const cvt = pct(count, prev);
    const color = STATUS_COLORS[s] || '#64748b';
    if (i > 0) {
      const pc = cvt >= 80 ? '#22c55e' : cvt >= 50 ? '#f59e0b' : '#ef4444';
      parts.push(\`<div class="funnel-arrow">›</div>
        <div class="funnel-stage" style="min-width:38px"><span class="funnel-pct" style="background:\${pc}1a;color:\${pc}">\${cvt}%</span></div>
        <div class="funnel-arrow">›</div>\`);
    }
    parts.push(\`<div class="funnel-stage">
      <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:\${color}18;color:\${color}">\${count>999?'999+':count}</div>
      <span class="funnel-label" style="color:\${color}bb">\${STATUS_LABELS[s]||s}</span>
    </div>\`);
  }
  el.innerHTML = parts.join('');
}

function renderQueues(data) {
  const el = document.getElementById('queue-stats');
  if (!el) return;
  const qs = [
    { name:'Scraping', emoji:'🔍', s: data.queueStats.scrape },
    { name:'Pipeline', emoji:'⚙️', s: data.queueStats.pipeline },
    { name:'Disparo',  emoji:'📲', s: data.queueStats.dispatch },
  ];
  el.innerHTML = qs.map(q => {
    const { waiting=0, active=0, completed=0, failed=0 } = q.s || {};
    return \`<div class="flex items-center gap-3 py-2.5 border-b last:border-0" style="border-color:var(--border)">
      <span class="text-base w-6 text-center">\${q.emoji}</span>
      <span class="flex-1 text-sm font-medium text-white">\${q.name}</span>
      <div class="flex gap-3 text-xs font-mono">
        <span style="color:#f59e0b">\${waiting}</span>
        <span style="color:#6366f1">\${active}</span>
        <span style="color:#22c55e">\${completed}</span>
        <span style="color:\${failed>0?'#ef4444':'var(--text-muted)'}">\${failed}</span>
      </div>
    </div>\`;
  }).join('');
}

let _allLeads = [];
function renderLeads(data) {
  _allLeads = data.recentLeads || [];
  filterLeads();
}
function filterLeads() {
  const filter = (document.getElementById('filter-status')||{}).value || '';
  const filtered = filter ? _allLeads.filter(l => l.status === filter) : _allLeads;
  const countEl = document.getElementById('leads-count');
  if (countEl) countEl.textContent = filtered.length + ' leads';
  const tbody = document.getElementById('leads-table');
  const empty = document.getElementById('leads-empty');
  if (!filtered.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (tbody) tbody.innerHTML = filtered.map(l => {
    const canOpen = ['screenshot_ready','dispatched','replied'].includes(l.status);
    const canRetry = RETRYABLE.has(l.status);
    const viewBtn = canOpen
      ? \`<button class="retry-btn" onclick="openLead('\${esc(l.id)}')" style="background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.3);color:#a5b4fc">🔍 Ver</button>\`
      : '';
    const retryBtn = canRetry
      ? \`<button class="retry-btn" data-retry="\${esc(l.id)}" onclick="retryLead('\${esc(l.id)}')">↺ retry</button>\`
      : '';
    const actions = (viewBtn || retryBtn)
      ? \`<div style="display:flex;gap:4px;flex-wrap:wrap">\${viewBtn}\${retryBtn}</div>\`
      : '<span style="color:var(--text-muted);font-size:11px">—</span>';
    return \`<tr class="table-row border-b" style="border-color:rgba(255,255,255,0.04)">
      <td class="py-3 pr-4">
        <div class="font-medium text-white text-sm leading-none">\${esc(l.name)}</div>
        \${l.phone ? \`<div class="text-xs mt-1" style="color:var(--text-muted)">\${esc(l.phone)}</div>\` : ''}
      </td>
      <td class="py-3 pr-4 hide-mobile"><span class="text-xs" style="color:var(--text-secondary)">\${esc(l.city||'—')}</span></td>
      <td class="py-3 pr-4">\${nicheBadge(l.niche)}</td>
      <td class="py-3 pr-4">\${scoreBar(l.score)}</td>
      <td class="py-3 pr-4">\${statusBadge(l.status)}</td>
      <td class="py-3 pr-4 hide-mobile"><span class="text-xs font-mono" style="color:var(--text-muted)">\${fmtDate(l.scrapedAt)}</span></td>
      <td class="py-3">\${actions}</td>
    </tr>\`;
  }).join('');
}

function renderAll(data) {
  renderCards(data);
  renderFunnel(data);
  renderQueues(data);
  renderLeads(data);
  renderFailures(data);
  detectNewQualified(data.recentLeads || []);
  const lu = document.getElementById('last-update');
  if (lu) lu.textContent = 'há ' + timeAgo(data.timestamp);
}

document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('filter-status');
  if (f) f.addEventListener('change', filterLeads);
});

// ── SSE ──────────────────────────────────────────────────────────────────────
function connect() {
  const dot = document.getElementById('live-dot');
  const txt = document.getElementById('live-text');
  function setLive(v) {
    if (!dot || !txt) return;
    if (v) { dot.classList.remove('off'); txt.textContent = 'Ao vivo'; }
    else   { dot.classList.add('off');    txt.textContent = 'Reconectando...'; }
  }
  const es = new EventSource('/events');
  es.onopen    = () => setLive(true);
  es.onmessage = (e) => { try { renderAll(JSON.parse(e.data)); } catch {} };
  es.onerror   = () => { setLive(false); es.close(); setTimeout(connect, 5000); };
}
connect();
})();
</script>
</body>
</html>`;
}

// ── Express server ─────────────────────────────────────────────────────────────

export function createDashboardServer(port = 3000): Server {
  const app = express();
  app.use(express.json());

  const sseClients = new Set<Response>();
  let broadcastInterval: ReturnType<typeof setInterval> | null = null;

  async function broadcast(): Promise<void> {
    if (sseClients.size === 0) return;
    try {
      const stats = await getStats();
      const payload = `data: ${JSON.stringify(stats)}\n\n`;
      for (const client of sseClients) client.write(payload);
    } catch {
      // DB may be temporarily busy — silently skip this tick
    }
  }

  // Unprotected routes
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime(), ts: Date.now() });
  });

  app.get("/metrics", async (_req: Request, res: Response) => {
    try {
      const stats = await getStats();
      updatePrometheusMetrics(stats.dbStats, stats.queueStats);
      res.setHeader("Content-Type", metricsRegistry.contentType);
      res.send(await metricsRegistry.metrics());
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  // Apply auth to all other routes
  app.use(basicAuthMiddleware);

  app.get("/events", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.add(res);

    void getStats().then((stats) => {
      res.write(`data: ${JSON.stringify(stats)}\n\n`);
    });

    req.on("close", () => sseClients.delete(res));
  });

  app.get("/api/stats", async (_req: Request, res: Response) => {
    res.json(await getStats());
  });

  app.post("/api/scrape/start", async (_req: Request, res: Response) => {
    const { targetCities, targetNiches, maxLeadsPerRun } = config.scraping;
    const queries = getNicheQueries(targetNiches);
    const total = await enqueueScrapeJobs(targetCities, targetNiches, maxLeadsPerRun, queries);
    _cachedStats = null;
    log.info({ total }, "Scraping iniciado manualmente via dashboard");
    res.json({ ok: true, jobsEnqueued: total });
  });

  app.get("/api/leads/:id", async (req: Request, res: Response) => {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) { res.status(400).json({ ok: false }); return; }
    const lead = await leadRepository.findById(id);
    if (!lead) { res.status(404).json({ ok: false }); return; }
    res.json(lead);
  });

  app.get("/api/leads/:id/screenshot", async (req: Request, res: Response) => {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) { res.status(400).end(); return; }
    const lead = await leadRepository.findById(id);
    if (!lead?.screenshotPath) { res.status(404).end(); return; }
    res.sendFile(resolvePath(lead.screenshotPath));
  });

  app.get("/api/dispatch/status", (_req: Request, res: Response) => {
    res.json(getDispatchStatus());
  });

  app.post("/api/dispatch/override", (req: Request, res: Response) => {
    const body = req.body as { enabled?: boolean };
    const current = getDispatchStatus();
    const newValue = typeof body.enabled === "boolean" ? body.enabled : !current.manualOverride;
    setManualOverride(newValue);
    log.info({ manualOverride: newValue }, "Override manual de disparo alterado via dashboard");
    res.json({ ok: true, ...getDispatchStatus() });
  });

  app.post("/api/leads/:id/retry", async (req: Request, res: Response) => {
    // req.params values are string | string[] in Express 5 types — normalize to string
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({ ok: false, error: "ID inválido" });
      return;
    }

    const lead = await leadRepository.findById(id);
    if (!lead) {
      res.status(404).json({ ok: false, error: "Lead não encontrado" });
      return;
    }

    if (lead.status === "dispatched" || lead.status === "replied") {
      res.status(409).json({ ok: false, error: `Lead já está com status "${lead.status}"` });
      return;
    }

    await leadRepository.updateStatus(id, "scraped");
    _cachedStats = null; // Invalidate cache so next SSE tick reflects the change

    await pipelineQueue.add(`reprocess-${id}-${Date.now()}`, {
      leadId: id,
      placeId: lead.placeId,
    });

    log.info({ leadId: id, name: lead.name }, "Lead reprocessado via dashboard");
    res.json({ ok: true, message: `Lead "${lead.name}" reprocessado` });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.send(getDashboardHtml());
  });

  broadcastInterval = setInterval(() => void broadcast(), 3_000);

  const server = app.listen(port, () => {
    const authMode = config.app.dashboardPassword ? "com autenticação" : "sem autenticação (defina DASHBOARD_PASSWORD)";
    log.info({ port, authMode }, `Dashboard disponível em http://localhost:${port}`);
  });

  // Fix: clear interval when server closes to prevent memory leak
  server.on("close", () => {
    if (broadcastInterval) {
      clearInterval(broadcastInterval);
      broadcastInterval = null;
    }
  });

  return server;
}
