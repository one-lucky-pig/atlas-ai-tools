import type { CategorySeed, ToolEnrichment, ToolSeed } from "../../src/lib/factory/types";
import { createDefaultEnrichment } from "../../src/lib/factory/default-enrichment";
import { createProvider } from "../llm/providers";
import { loadEnrichmentCache, mergeEnrichmentCache, saveEnrichmentCache } from "./enrichment-cache";
import { enrichmentCacheFile } from "./paths";

export async function enrichToolForStudio(input: {
  tool: ToolSeed;
  categories: CategorySeed[];
  cacheFile?: string;
  force?: boolean;
}): Promise<{
  provider: string;
  cached: boolean;
  enrichment: ToolEnrichment;
}> {
  const category = input.categories.find((candidate) => candidate.slug === input.tool.category);
  if (!category) {
    throw new Error(`Unknown category for tool ${input.tool.slug}: ${input.tool.category}`);
  }

  const cacheFile = input.cacheFile ?? enrichmentCacheFile;
  const cache = await loadEnrichmentCache(cacheFile);
  const cached = cache[input.tool.slug];

  if (cached && !input.force) {
    return {
      provider: "cache",
      cached: true,
      enrichment: cached
    };
  }

  const provider = createProvider(process.env.LLM_PROVIDER);
  if (!provider) {
    return {
      provider: "fallback",
      cached: false,
      enrichment: createDefaultEnrichment(input.tool)
    };
  }

  try {
    const enrichment = await provider.enrichTool(input.tool, category);
    const nextCache = mergeEnrichmentCache(cache, {
      [input.tool.slug]: enrichment
    });
    await saveEnrichmentCache(cacheFile, nextCache);

    return {
      provider: provider.name,
      cached: false,
      enrichment
    };
  } catch {
    return {
      provider: "fallback",
      cached: false,
      enrichment: createDefaultEnrichment(input.tool)
    };
  }
}
