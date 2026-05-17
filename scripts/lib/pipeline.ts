import type {
  CategorySeed,
  GeneratedPage,
  PublishingDecision,
  PublishingMetrics,
  SiteBundle,
  SiteConfig,
  ToolEnrichment,
  ToolSeed
} from "../../src/lib/factory/types";
import { buildSiteBundle } from "../../src/lib/factory/content-factory";
import { evaluatePageQuality } from "../../src/lib/factory/quality";
import { resolveSiteConfig } from "../../src/lib/factory/site-config";
import { decidePublishingAction } from "../../src/lib/factory/strategy";
import { loadEnrichmentCache, mergeEnrichmentCache, saveEnrichmentCache } from "./enrichment-cache";
import { readJsonFile, writeJsonFile } from "./io";
import {
  categorySeedFile,
  enrichmentCacheFile,
  decisionFile,
  generatedBundleFile,
  observationFile,
  pipelineReportFile,
  siteFile,
  toolSeedFile
} from "./paths";
import { createProvider } from "../llm/providers";

async function generateEnrichments(
  categories: CategorySeed[],
  tools: ToolSeed[]
): Promise<{
  provider: string;
  enrichments: Record<string, ToolEnrichment>;
  cachedTools: number;
}> {
  const providerName = process.env.LLM_PROVIDER;
  const provider = createProvider(providerName);
  const cachedEnrichments = await loadEnrichmentCache(enrichmentCacheFile);
  const freshEnrichments: Record<string, ToolEnrichment> = {};

  if (!provider) {
    await saveEnrichmentCache(enrichmentCacheFile, cachedEnrichments);
    return {
      provider: "fallback",
      enrichments: cachedEnrichments,
      cachedTools: Object.keys(cachedEnrichments).length
    };
  }

  for (const tool of tools) {
    if (cachedEnrichments[tool.slug]) {
      continue;
    }

    const category = categories.find((candidate) => candidate.slug === tool.category);
    if (!category) {
      continue;
    }

    try {
      freshEnrichments[tool.slug] = await provider.enrichTool(tool, category);
    } catch (error) {
      console.warn(`Falling back to deterministic enrichment for ${tool.slug}:`, error);
    }
  }

  const enrichments = mergeEnrichmentCache(cachedEnrichments, freshEnrichments);
  await saveEnrichmentCache(enrichmentCacheFile, enrichments);

  return {
    provider: provider.name,
    enrichments,
    cachedTools: Object.keys(cachedEnrichments).length
  };
}

function validateBundle(bundle: SiteBundle): Array<{
  slug: string;
  issues: string[];
}> {
  const seenTitles = new Set<string>();
  const failures: Array<{ slug: string; issues: string[] }> = [];

  for (const page of bundle.pages) {
    const result = evaluatePageQuality(page, seenTitles);
    if (!result.ok) {
      failures.push({
        slug: page.slug,
        issues: result.issues
      });
    }
    seenTitles.add(page.title);
  }

  return failures;
}

async function loadPublishingObservations(): Promise<PublishingMetrics[]> {
  try {
    return await readJsonFile<PublishingMetrics[]>(observationFile);
  } catch {
    return [];
  }
}

async function writePublishingDecisions(decisions: PublishingDecision[]): Promise<void> {
  if (decisions.length === 0) {
    return;
  }

  await writeJsonFile(decisionFile, decisions);
}

export async function runPipeline(): Promise<{
  bundle: SiteBundle;
  provider: string;
  cachedTools: number;
  decisions: PublishingDecision[];
}> {
  const site = resolveSiteConfig(await readJsonFile<SiteConfig>(siteFile), process.env);
  const categories = await readJsonFile<CategorySeed[]>(categorySeedFile);
  const tools = await readJsonFile<ToolSeed[]>(toolSeedFile);
  const enrichmentResult = await generateEnrichments(categories, tools);

  const bundle = buildSiteBundle({
    site,
    categories,
    tools,
    enrichments: enrichmentResult.enrichments
  });

  const failures = validateBundle(bundle);
  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.slug}: ${failure.issues.join("; ")}`)
      .join("\n");
    throw new Error(`Publishing quality gates failed:\n${summary}`);
  }

  await writeJsonFile(generatedBundleFile, bundle);
  await writeJsonFile(pipelineReportFile, {
    generatedAt: new Date().toISOString(),
    provider: enrichmentResult.provider,
    cachedTools: enrichmentResult.cachedTools,
    counts: bundle.pages.reduce<Record<string, number>>((accumulator, page) => {
      accumulator[page.pageType] = (accumulator[page.pageType] ?? 0) + 1;
      return accumulator;
    }, {}),
    totalPages: bundle.pages.length
  });

  const decisions = (await loadPublishingObservations()).map((observation) => decidePublishingAction(observation));
  await writePublishingDecisions(decisions);

  return {
    bundle,
    provider: enrichmentResult.provider,
    cachedTools: enrichmentResult.cachedTools,
    decisions
  };
}

export async function validateGeneratedBundle(): Promise<{
  pages: GeneratedPage[];
  failures: Array<{ slug: string; issues: string[] }>;
}> {
  const bundle = await readJsonFile<SiteBundle>(generatedBundleFile);
  const failures = validateBundle(bundle);

  return {
    pages: bundle.pages,
    failures
  };
}
