import { describe, expect, test } from "vitest";

import {
  buildStudioReadinessChecks,
  createEmptyCategory,
  createEmptyTool,
  createStudioState,
  getStudioValidationIssues,
  parseBulkToolRows,
  parseStudioImportJson,
  serializeStudioExport
} from "../src/lib/studio";
import type { CategorySeed, SiteConfig, ToolSeed } from "../src/lib/factory/types";

const site: SiteConfig = {
  name: "Atlas AI Tools",
  domain: "example.com",
  url: "https://example.com",
  description: "Editorial AI tools directory.",
  contactEmail: "contact@example.com",
  legalEntity: "Atlas AI Tools"
};

const categories: CategorySeed[] = [
  {
    slug: "ai-writing",
    name: "AI Writing Tools",
    description: "Writing tools."
  }
];

const tools: ToolSeed[] = [
  {
    slug: "jasper",
    name: "Jasper",
    category: "ai-writing",
    subcategories: ["copywriting"],
    officialUrl: "https://www.jasper.ai",
    pricingModel: "subscription",
    coreFeatures: ["brand voice"],
    useCases: ["landing pages"],
    targetUsers: ["marketers"]
  }
];

describe("studio helpers", () => {
  test("creates isolated editable state from site and seed data", () => {
    const state = createStudioState({ site, categories, tools });

    expect(state.site.name).toBe("Atlas AI Tools");
    expect(state.categories).toHaveLength(1);
    expect(state.tools).toHaveLength(1);

    state.categories[0].name = "Changed";
    expect(categories[0].name).toBe("AI Writing Tools");
  });

  test("serializes export payloads as pretty JSON strings", () => {
    const state = createStudioState({ site, categories, tools });
    const payload = serializeStudioExport(state);

    expect(payload.site).toContain('"name": "Atlas AI Tools"');
    expect(payload.categories).toContain('"slug": "ai-writing"');
    expect(payload.tools).toContain('"slug": "jasper"');
  });

  test("returns validation issues for duplicate slugs and unknown categories", () => {
    const issues = getStudioValidationIssues({
      site,
      categories,
      tools: [
        tools[0],
        {
          ...tools[0],
          name: "Jasper Duplicate",
          category: "unknown-category"
        }
      ]
    });

    expect(issues.join(" ")).toMatch(/duplicate tool slug|unknown category/i);
  });

  test("creates empty category and tool drafts with safe defaults", () => {
    const categoryDraft = createEmptyCategory();
    const toolDraft = createEmptyTool("ai-writing");

    expect(categoryDraft.slug).toBe("");
    expect(toolDraft.category).toBe("ai-writing");
    expect(toolDraft.subcategories).toEqual([""]);
  });

  test("parses imported JSON for categories and tools", () => {
    const importedCategories = parseStudioImportJson(
      "categories",
      JSON.stringify(categories)
    );
    const importedTools = parseStudioImportJson("tools", JSON.stringify(tools));

    expect(importedCategories).toHaveLength(1);
    expect(importedTools).toHaveLength(1);
  });

  test("parses bulk tool rows with pipe-separated columns", () => {
    const rows = parseBulkToolRows(
      "Lindy|lindy|ai-productivity|https://lindy.ai|subscription|automation,assistant|workflow builder,agents|ops automation,follow-ups|operators,founders",
      "ai-writing"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe("lindy");
    expect(rows[0].category).toBe("ai-productivity");
    expect(rows[0].coreFeatures).toEqual(["workflow builder", "agents"]);
  });

  test("uses fallback category when bulk rows omit the category column", () => {
    const rows = parseBulkToolRows(
      "Lindy|lindy||https://lindy.ai|subscription|automation|workflow builder|ops automation|operators",
      "ai-productivity"
    );

    expect(rows[0].category).toBe("ai-productivity");
  });

  test("builds readiness checks that flag placeholder production settings", () => {
    const checks = buildStudioReadinessChecks({
      site,
      categories,
      tools
    });

    expect(checks.some((check) => check.key === "production-domain" && check.ok === false)).toBe(true);
    expect(checks.some((check) => check.key === "contact-email" && check.ok === false)).toBe(true);
  });
});
