import type { ToolEnrichment } from "../../src/lib/factory/types";
import { readJsonFile, writeJsonFile } from "./io";

export async function loadEnrichmentCache(filePath: string): Promise<Record<string, ToolEnrichment>> {
  try {
    return await readJsonFile<Record<string, ToolEnrichment>>(filePath);
  } catch {
    return {};
  }
}

export async function saveEnrichmentCache(
  filePath: string,
  cache: Record<string, ToolEnrichment>
): Promise<void> {
  await writeJsonFile(filePath, cache);
}

export function mergeEnrichmentCache(
  cached: Record<string, ToolEnrichment>,
  fresh: Record<string, ToolEnrichment>
): Record<string, ToolEnrichment> {
  return {
    ...cached,
    ...fresh
  };
}
