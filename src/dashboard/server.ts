import express, { type Request, type Response } from "express";
import { type Server } from "http";
import { desc } from "drizzle-orm";
import { db } from "../database/client.js";
import { leads } from "../database/schema.js";
import { leadRepository } from "../database/repositories/lead.repository.js";
import { getQueueStats } from "../modules/queue/queue-manager.js";
import { createModuleLogger } from "../utils/logger.js";

const log = createModuleLogger("dashboard");

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

async function getStats() {
  const [dbStats, queueStats, recentLeads] = await Promise.all([
    leadRepository.countByStatus(),
    getQueueStats(),
    db.select().from(leads).orderBy(desc(leads.updatedAt)).limit(30),
  ]);

  const total = Object.values(dbStats).reduce((a, b) => a + b, 0);

  return {
    dbStats,
    queueStats,
    recentLeads,
    total,
    timestamp: Date.now(),
  };
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prospector Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; }
    .queue-row:hover { background: #1e293b; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #1e293b; } ::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
  </style>
</head>
<body class="min-h-screen text-slate-100 p-6">

  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl">🎯</div>
      <div>
        <h1 class="text-xl font-bold text-white">Prospector Automatizado</h1>
        <p class="text-slate-400 text-sm">Dashboard de Monitoramento</p>
      </div>
    </div>
    <div class="flex items-center gap-2 text-sm text-slate-400">
      <div class="pulse-dot" id="status-dot"></div>
      <span id="status-text">Conectando...</span>
      <span class="text-slate-600 ml-2" id="last-update"></span>
    </div>
  </div>

  <!-- Stat Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="stat-cards">
    <div class="card p-4">
      <p class="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Coletado</p>
      <p class="text-3xl font-bold text-white" id="stat-total">—</p>
    </div>
    <div class="card p-4">
      <p class="text-slate-400 text-xs uppercase tracking-wide mb-1">Prontos p/ Envio</p>
      <p class="text-3xl font-bold text-emerald-400" id="stat-ready">—</p>
    </div>
    <div class="card p-4">
      <p class="text-slate-400 text-xs uppercase tracking-wide mb-1">Enviados</p>
      <p class="text-3xl font-bold text-cyan-400" id="stat-dispatched">—</p>
    </div>
    <div class="card p-4">
      <p class="text-slate-400 text-xs uppercase tracking-wide mb-1">Responderam</p>
      <p class="text-3xl font-bold text-green-400" id="stat-replied">—</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

    <!-- Status breakdown -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Status dos Leads</h2>
      <div id="status-breakdown" class="space-y-2"></div>
    </div>

    <!-- Queue stats -->
    <div class="card p-5 lg:col-span-2">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Filas de Processamento</h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-slate-500 text-xs uppercase">
            <th class="text-left pb-3">Fila</th>
            <th class="text-right pb-3">Aguardando</th>
            <th class="text-right pb-3">Ativo</th>
            <th class="text-right pb-3">Concluído</th>
            <th class="text-right pb-3">Falhou</th>
          </tr>
        </thead>
        <tbody id="queue-table" class="divide-y divide-slate-700/50"></tbody>
      </table>
    </div>
  </div>

  <!-- Leads table -->
  <div class="card p-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">Últimos Leads</h2>
      <span class="text-xs text-slate-500" id="leads-count"></span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-slate-500 text-xs uppercase border-b border-slate-700">
            <th class="text-left pb-3 pr-4">Empresa</th>
            <th class="text-left pb-3 pr-4">Cidade</th>
            <th class="text-left pb-3 pr-4">Nicho</th>
            <th class="text-right pb-3 pr-4">Score</th>
            <th class="text-left pb-3 pr-4">Status</th>
            <th class="text-left pb-3">Atualizado</th>
          </tr>
        </thead>
        <tbody id="leads-table" class="divide-y divide-slate-700/30"></tbody>
      </table>
    </div>
  </div>

<script>
const STATUS_LABELS = ${JSON.stringify(STATUS_LABELS)};
const STATUS_COLORS = ${JSON.stringify(STATUS_COLORS)};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return diff + 's atrás';
  if (diff < 3600) return Math.floor(diff/60) + 'min atrás';
  return Math.floor(diff/3600) + 'h atrás';
}

function badge(status) {
  const color = STATUS_COLORS[status] || '#64748b';
  const label = STATUS_LABELS[status] || status;
  return \`<span class="badge" style="background:\${color}22;color:\${color};border:1px solid \${color}44">\${label}</span>\`;
}

function renderStats(data) {
  // Cards
  document.getElementById('stat-total').textContent = data.total;
  document.getElementById('stat-ready').textContent = data.dbStats.screenshot_ready || 0;
  document.getElementById('stat-dispatched').textContent = data.dbStats.dispatched || 0;
  document.getElementById('stat-replied').textContent = data.dbStats.replied || 0;

  // Status breakdown
  const breakdown = document.getElementById('status-breakdown');
  const statuses = ['scraped','validated','scored','page_generated','screenshot_ready','dispatched','replied','disqualified'];
  breakdown.innerHTML = statuses.map(s => {
    const count = data.dbStats[s] || 0;
    const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
    const color = STATUS_COLORS[s] || '#64748b';
    return \`<div class="flex items-center gap-2">
      <div class="flex-1 flex items-center gap-2">
        <div class="w-2 h-2 rounded-full" style="background:\${color}"></div>
        <span class="text-slate-400 text-xs">\${STATUS_LABELS[s]}</span>
      </div>
      <div class="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div class="h-full rounded-full" style="width:\${pct}%;background:\${color}"></div>
      </div>
      <span class="text-white text-xs font-mono w-6 text-right">\${count}</span>
    </div>\`;
  }).join('');

  // Queues
  const qTable = document.getElementById('queue-table');
  const queues = [
    { name: '🔍 Scraping', key: 'scrape', ...data.queueStats.scrape },
    { name: '⚙️ Pipeline', key: 'pipeline', ...data.queueStats.pipeline },
    { name: '📲 Disparo', key: 'dispatch', ...data.queueStats.dispatch },
  ];
  qTable.innerHTML = queues.map(q => \`
    <tr class="queue-row">
      <td class="py-2.5 pr-4 font-medium text-slate-200">\${q.name}</td>
      <td class="py-2.5 pr-4 text-right text-amber-400 font-mono">\${q.waiting}</td>
      <td class="py-2.5 pr-4 text-right text-blue-400 font-mono">\${q.active}</td>
      <td class="py-2.5 pr-4 text-right text-emerald-400 font-mono">\${q.completed}</td>
      <td class="py-2.5 text-right text-red-400 font-mono">\${q.failed}</td>
    </tr>\`).join('');

  // Leads
  const lTable = document.getElementById('leads-table');
  document.getElementById('leads-count').textContent = data.recentLeads.length + ' mais recentes';
  lTable.innerHTML = data.recentLeads.map(l => \`
    <tr class="hover:bg-slate-800/50 transition-colors">
      <td class="py-2.5 pr-4">
        <div class="font-medium text-white text-sm">\${l.name}</div>
        \${l.phone ? \`<div class="text-slate-500 text-xs">\${l.phone}</div>\` : ''}
      </td>
      <td class="py-2.5 pr-4 text-slate-400 text-xs">\${l.city}</td>
      <td class="py-2.5 pr-4 text-slate-400 text-xs capitalize">\${l.niche || '—'}</td>
      <td class="py-2.5 pr-4 text-right">
        \${l.score != null
          ? \`<span class="font-mono font-bold \${l.score >= 60 ? 'text-emerald-400' : l.score >= 40 ? 'text-amber-400' : 'text-slate-500'}">\${Math.round(l.score)}</span>\`
          : '<span class="text-slate-600">—</span>'}
      </td>
      <td class="py-2.5 pr-4">\${badge(l.status)}</td>
      <td class="py-2.5 text-slate-500 text-xs">\${timeAgo(l.updatedAt)}</td>
    </tr>\`).join('');

  // Status
  document.getElementById('status-text').textContent = 'Ao vivo';
  document.getElementById('last-update').textContent = 'Atualizado ' + timeAgo(data.timestamp);
}

// SSE connection
function connect() {
  const es = new EventSource('/events');
  es.onmessage = (e) => {
    try { renderStats(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => {
    document.getElementById('status-text').textContent = 'Reconectando...';
    document.getElementById('status-dot').style.background = '#ef4444';
  };
  es.onopen = () => {
    document.getElementById('status-dot').style.background = '#22c55e';
  };
}

connect();
</script>
</body>
</html>`;
}

export function createDashboardServer(port = 3000): Server {
  const app = express();
  const sseClients = new Set<Response>();

  async function broadcast() {
    if (sseClients.size === 0) return;
    try {
      const stats = await getStats();
      const payload = `data: ${JSON.stringify(stats)}\n\n`;
      for (const client of sseClients) {
        client.write(payload);
      }
    } catch {
      // silencioso — DB pode estar ocupado
    }
  }

  setInterval(() => void broadcast(), 3_000);

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

  app.get("/", (_req: Request, res: Response) => {
    res.send(getDashboardHtml());
  });

  const server = app.listen(port, () => {
    log.info({ port }, `Dashboard disponível em http://localhost:${port}`);
  });

  return server;
}
