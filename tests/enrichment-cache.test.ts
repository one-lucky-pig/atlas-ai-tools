import { afterEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadEnrichmentCache, mergeEnrichmentCache, saveEnrichmentCache } from "../scripts/lib/enrichment-cache";
import type { ToolEnrichment } from "../src/lib/factory/types";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

const jasper: ToolEnrichment = {
  summary: "Jasper summary",
  pros: ["Campaign structure"],
  cons: ["Needs editing"],
  alternatives: ["copy-ai"],
  faq: [{ question: "Q", answer: "A" }],
  metaDescription: "Jasper meta",
  editorialAngles: ["launch copy"],
  suggestedInternalLinks: [{ label: "AI writing", href: "/categories/ai-writing" }]
};

describe("enrichment cache helpers", () => {
  test("returns an empty cache when no cache file exists", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-cache-"));
    const cachePath = path.join(tempDir, "enrichments.json");

    await expect(loadEnrichmentCache(cachePath)).resolves.toEqual({});
  });

  test("persists cache content to disk", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "atlas-cache-"));
    const cachePath = path.join(tempDir, "nested", "enrichments.json");

    await saveEnrichmentCache(cachePath, { jasper });

    const raw = await readFile(cachePath, "utf-8");
    expect(JSON.parse(raw)).toEqual({ jasper });
  });

  test("merges cached and fresh enrichments without dropping existing tools", () => {
    const result = mergeEnrichmentCache(
      { jasper },
      {
        "copy-ai": {
          ...jasper,
          summary: "Copy summary",
          metaDescription: "Copy meta",
          alternatives: ["jasper"]
        }
      }
    );

    expect(result).toHaveProperty("jasper");
    expect(result).toHaveProperty("copy-ai");
  });
});
