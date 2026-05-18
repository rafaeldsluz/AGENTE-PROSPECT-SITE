import { Registry, Gauge, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

const leadsGauge = new Gauge({
  name: "prospector_leads",
  help: "Total de leads por status no banco de dados",
  labelNames: ["status"] as const,
  registers: [metricsRegistry],
});

const queueJobsGauge = new Gauge({
  name: "prospector_queue_jobs",
  help: "Jobs nas filas BullMQ por fila e estado",
  labelNames: ["queue", "state"] as const,
  registers: [metricsRegistry],
});

interface QueueSnapshot {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export function updatePrometheusMetrics(
  dbStats: Record<string, number>,
  queueStats: Record<string, QueueSnapshot>
): void {
  for (const [status, count] of Object.entries(dbStats)) {
    leadsGauge.set({ status }, count);
  }

  for (const [queueName, stats] of Object.entries(queueStats)) {
    queueJobsGauge.set({ queue: queueName, state: "waiting" }, stats.waiting);
    queueJobsGauge.set({ queue: queueName, state: "active" }, stats.active);
    queueJobsGauge.set({ queue: queueName, state: "completed" }, stats.completed);
    queueJobsGauge.set({ queue: queueName, state: "failed" }, stats.failed);
  }
}
