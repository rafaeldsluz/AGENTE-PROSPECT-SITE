import "dotenv/config";
import { dispatchQueue } from "../modules/queue/queue-manager.js";

async function main() {
  await dispatchQueue.pause();
  const counts = await dispatchQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed");
  console.log("Fila dispatch PAUSADA:", JSON.stringify(counts));
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
