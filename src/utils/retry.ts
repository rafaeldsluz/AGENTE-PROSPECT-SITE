import { sleep } from "./delay.js";
import { createModuleLogger } from "./logger.js";

const log = createModuleLogger("retry");

interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  factor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, factor = 2 } = options;
  let lastError: Error = new Error("Nenhuma tentativa realizada");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) break;

      const delay = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = Math.floor(delay + jitter);

      log.warn(
        { attempt, maxAttempts, delayMs: totalDelay, error: lastError.message },
        "Tentativa falhou, aguardando para retry"
      );

      options.onRetry?.(attempt, lastError);
      await sleep(totalDelay);
    }
  }

  throw lastError;
}
