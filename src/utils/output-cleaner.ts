import { promises as fs } from "fs";
import path from "path";
import { createModuleLogger } from "./logger.js";

const log = createModuleLogger("output-cleaner");

const MAX_AGE_MS = 7 * 24 * 3600 * 1_000; // 7 dias

async function cleanDirectory(dir: string): Promise<number> {
  let removed = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(dir, entry.name);
      try {
        const { mtimeMs } = await fs.stat(filePath);
        if (mtimeMs < cutoff) {
          await fs.unlink(filePath);
          removed++;
        }
      } catch {
        // arquivo pode ter sido removido entre readdir e stat — ignorar
      }
    }
  } catch (err: unknown) {
    // diretório pode não existir ainda na primeira execução
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn({ dir, error: String(err) }, "Erro ao limpar diretório");
    }
  }
  return removed;
}

export async function cleanOldOutputFiles(pagesDir: string, screenshotsDir: string): Promise<void> {
  const [pages, screenshots] = await Promise.all([
    cleanDirectory(pagesDir),
    cleanDirectory(screenshotsDir),
  ]);
  if (pages + screenshots > 0) {
    log.info({ pages, screenshots }, "Arquivos antigos de output removidos");
  }
}
