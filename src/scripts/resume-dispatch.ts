import "dotenv/config";
import { dispatchQueue } from "../modules/queue/queue-manager.js";

async function main() {
  await dispatchQueue.resume();
  const counts = await dispatchQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed", "paused");
  console.log("✅ Fila dispatch RETOMADA:", JSON.stringify(counts));
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
