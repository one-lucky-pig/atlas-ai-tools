import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { enrichToolForStudio } from "../scripts/lib/studio-enrichment";
import type { CategorySeed, ToolSeed } from "../src/lib/factory/types";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
  delete process.env.LLM_PROVIDER;
});

const categories: CategorySeed[] = [
  {
    slug: "ai-writing",
    name: "AI Writing Tools",
    description: "Writing tools"
  }
];

const tool: ToolSeed = {
  slug: "jasper",
  name: "Jasper",
  category: "ai-writing",
  subcategories: ["copywriting"],
  officialUrl: "https://www.jasper.ai",
  pricingModel: "subscription",
  coreFeatures: ["brand voice"],
  useCases: ["landing pages"],
  targetUsers: ["marketers"]
};

describe("enrichToolForStudio", () => {
  test("returns fallback enrichment when no provider is configured", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-enrich-"));
    const cacheFile = path.join(tempDir, "enrichments.json");

    const result = await enrichToolForStudio({
      tool,
      categories,
      cacheFile
    });

    expect(result.provider).toBe("fallback");
    expect(result.cached).toBe(false);
    expect(result.enrichment.summary).toMatch(/Jasper/i);
  });

  test("throws when the tool references an unknown category", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-enrich-"));
    const cacheFile = path.join(tempDir, "enrichments.json");

    await expect(
      enrichToolForStudio({
        tool: { ...tool, category: "unknown-category" },
        categories,
        cacheFile
      })
    ).rejects.toThrow(/unknown category/i);
  });
});
