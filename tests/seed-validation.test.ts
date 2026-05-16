import { describe, expect, test } from "vitest";

import { validateToolCatalog } from "../src/lib/factory/validation";
import type { CategorySeed, ToolSeed } from "../src/lib/factory/types";

const categories: CategorySeed[] = [
  {
    slug: "ai-writing",
    name: "AI Writing Tools",
    description: "Tools for blog posts, marketing copy, and editorial workflows."
  },
  {
    slug: "ai-video",
    name: "AI Video Tools",
    description: "Tools for editing, clipping, and repurposing videos."
  }
];

const tools: ToolSeed[] = [
  {
    slug: "jasper",
    name: "Jasper",
    category: "ai-writing",
    subcategories: ["copywriting", "content-marketing"],
    officialUrl: "https://www.jasper.ai",
    pricingModel: "subscription",
    coreFeatures: ["brand voice", "campaign generation"],
    useCases: ["landing pages", "product marketing"],
    targetUsers: ["marketers", "content teams"]
  },
  {
    slug: "descript",
    name: "Descript",
    category: "ai-video",
    subcategories: ["video-editing", "podcasting"],
    officialUrl: "https://www.descript.com",
    pricingModel: "freemium",
    coreFeatures: ["text-based editing", "screen recording"],
    useCases: ["podcasts", "social repurposing"],
    targetUsers: ["creators", "small teams"]
  }
];

describe("validateToolCatalog", () => {
  test("accepts a valid tool catalog", () => {
    expect(() => validateToolCatalog({ categories, tools })).not.toThrow();
  });

  test("rejects duplicate tool slugs", () => {
    expect(() =>
      validateToolCatalog({
        categories,
        tools: [tools[0], { ...tools[0], name: "Jasper Clone" }]
      })
    ).toThrowError(/duplicate tool slug/i);
  });

  test("rejects tools that reference unknown categories", () => {
    expect(() =>
      validateToolCatalog({
        categories,
        tools: [{ ...tools[0], category: "unknown-category" }]
      })
    ).toThrowError(/unknown category/i);
  });
});
