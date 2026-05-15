import { Orchestrator } from "./orchestrator.js";
import { logger } from "./utils/logger.js";

const orchestrator = new Orchestrator();

async function main(): Promise<void> {
  logger.info("=== PROSPECTOR AUTOMATIZADO v1.0.0 ===");

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, "Sinal de encerramento recebido");
    await orchestrator.shutdown();
    process.exit(0);
  };

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.fatal({ error: err.message, stack: err.stack }, "Exceção não capturada");
    void orchestrator.shutdown().then(() => process.exit(1));
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason: String(reason) }, "Promise rejection não tratada");
  });

  try {
    await orchestrator.start();
  } catch (err) {
    logger.fatal({ error: String(err) }, "Falha crítica ao iniciar sistema");
    await orchestrator.shutdown();
    process.exit(1);
  }
}

void main();
