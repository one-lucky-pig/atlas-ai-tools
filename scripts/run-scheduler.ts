import "dotenv/config";
import { writeJsonFile } from "./lib/io";
import { runPipeline } from "./lib/pipeline";
import { schedulerStateFile } from "./lib/paths";

const intervalMinutes = Number(process.env.SCHEDULER_INTERVAL_MINUTES ?? "360");
const runOnce = process.argv.includes("--once");

async function tick(): Promise<void> {
  const startedAt = new Date().toISOString();

  try {
    const result = await runPipeline();
    await writeJsonFile(schedulerStateFile, {
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      provider: result.provider,
      cachedTools: result.cachedTools,
      totalPages: result.bundle.pages.length,
      decisions: result.decisions
    });
    console.log(`[scheduler] completed run at ${startedAt}`);
  } catch (error) {
    await writeJsonFile(schedulerStateFile, {
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
    console.error("[scheduler] pipeline run failed", error);
  }
}

await tick();

if (!runOnce) {
  setInterval(() => {
    void tick();
  }, intervalMinutes * 60 * 1000);
}
