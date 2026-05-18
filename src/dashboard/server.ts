import express, { type Request, type Response, type NextFunction } from "express";
import { type Server } from "http";
import { desc } from "drizzle-orm";
import { db } from "../database/client.js";
import { leads, type Lead } from "../database/schema.js";
import { leadRepository } from "../database/repositories/lead.repository.js";
import { getQueueStats, pipelineQueue } from "../modules/queue/queue-manager.js";
import { metricsRegistry, updatePrometheusMetrics } from "../metrics/index.js";
import { createModuleLogger } from "../utils/logger.js";
import { config } from "../config/index.js";

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
  total: number;
  timestamp: number;
}

let _cachedStats: StatsSnapshot | null = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 1_500;

async function getStats(): Promise<StatsSnapshot> {
  if (_cachedStats !== null && Date.now() < _cacheExpiresAt) return _cachedStats;

  const [dbStats, queueStats, recentLeads] = await Promise.all([
    leadRepository.countByStatus(),
    getQueueStats(),
    db.select().from(leads).orderBy(desc(leads.updatedAt)).limit(50),
  ]);

  const total = Object.values(dbStats).reduce((a, b) => a + b, 0);

  _cachedStats = { dbStats, queueStats, recentLeads, total, timestamp: Date.now() };
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
    @keyframes value-flash { 0% { opacity: 0.5; transform: translateY(-3px); } 100% { opacity: 1; transform: translateY(0); } }
    .value-changed { animation: value-flash 0.25s ease forwards; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    @media (max-width: 768px) { .hide-mobile { display: none !important; } }
  </style>
</head>
<body>
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
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="live-dot off" id="live-dot"></div>
          <span class="text-xs font-medium" style="color:var(--text-secondary)" id="live-text">Conectando...</span>
        </div>
        <span class="text-xs hide-mobile" style="color:var(--text-muted)" id="last-update"></span>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div class="glass p-4 space-y-1.5">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Total</p>
        <p class="stat-value text-white" id="s-total">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">leads coletados</p>
      </div>
      <div class="glass p-4 space-y-1.5">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Fila de Envio</p>
        <p class="stat-value" style="color:#10b981" id="s-ready">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">prontos para disparar</p>
      </div>
      <div class="glass p-4 space-y-1.5">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Enviados</p>
        <p class="stat-value" style="color:#06b6d4" id="s-dispatched">—</p>
        <p class="text-xs" style="color:var(--text-secondary)">mensagens disparadas</p>
      </div>
      <div class="glass p-4 space-y-1.5">
        <p class="text-xs font-medium uppercase tracking-widest" style="color:var(--text-muted)">Responderam</p>
        <p class="stat-value" style="color:#22c55e" id="s-replied">—</p>
        <p class="text-xs" id="s-reply-rate" style="color:var(--text-secondary)">taxa de resposta</p>
      </div>
      <div class="glass p-4 space-y-1.5">
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
              <th class="pb-3 pr-4 text-xs font-medium uppercase tracking-wider hide-mobile" style="color:var(--text-muted)">Atualizado</th>
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
  const dispatched = data.dbStats.dispatched || 0;
  const replied    = data.dbStats.replied    || 0;
  setVal('s-total',        data.total);
  setVal('s-ready',        data.dbStats.screenshot_ready || 0);
  setVal('s-dispatched',   dispatched);
  setVal('s-replied',      replied);
  setVal('s-disqualified', data.dbStats.disqualified || 0);
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
    const canRetry = RETRYABLE.has(l.status);
    const retryBtn = canRetry
      ? \`<button class="retry-btn" data-retry="\${esc(l.id)}" onclick="retryLead('\${esc(l.id)}')">↺ retry</button>\`
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
      <td class="py-3 pr-4 hide-mobile"><span class="text-xs" style="color:var(--text-muted)">\${timeAgo(l.updatedAt)}</span></td>
      <td class="py-3">\${retryBtn}</td>
    </tr>\`;
  }).join('');
}

function renderAll(data) {
  renderCards(data);
  renderFunnel(data);
  renderQueues(data);
  renderLeads(data);
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
