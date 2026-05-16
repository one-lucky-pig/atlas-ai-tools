import { z } from "zod";

import type { CategorySeed, ToolSeed } from "./types";

const categorySeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1)
});

const toolSeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subcategories: z.array(z.string().min(1)).min(1),
  officialUrl: z.string().url(),
  pricingModel: z.string().min(1),
  coreFeatures: z.array(z.string().min(1)).min(1),
  useCases: z.array(z.string().min(1)).min(1),
  targetUsers: z.array(z.string().min(1)).min(1)
});

export function validateToolCatalog(input: {
  categories: CategorySeed[];
  tools: ToolSeed[];
}): void {
  const categories = z.array(categorySeedSchema).parse(input.categories);
  const tools = z.array(toolSeedSchema).parse(input.tools);

  const categorySlugs = new Set<string>();
  for (const category of categories) {
    if (categorySlugs.has(category.slug)) {
      throw new Error(`Duplicate category slug: ${category.slug}`);
    }
    categorySlugs.add(category.slug);
  }

  const toolSlugs = new Set<string>();
  for (const tool of tools) {
    if (toolSlugs.has(tool.slug)) {
      throw new Error(`Duplicate tool slug: ${tool.slug}`);
    }
    if (!categorySlugs.has(tool.category)) {
      throw new Error(`Unknown category for tool ${tool.slug}: ${tool.category}`);
    }
    toolSlugs.add(tool.slug);
  }
}
