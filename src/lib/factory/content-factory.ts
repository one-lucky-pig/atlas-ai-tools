import type {
  CategorySeed,
  EnrichedTool,
  GeneratedCategory,
  GeneratedPage,
  SiteBundle,
  SiteConfig,
  ToolEnrichment,
  ToolSeed
} from "./types";
import { createDefaultEnrichment } from "./default-enrichment";
import { slugify } from "./utils";
import { validateToolCatalog } from "./validation";

function mergeTool(tool: ToolSeed, enrichment: ToolEnrichment | undefined): EnrichedTool {
  return {
    ...tool,
    ...(enrichment ?? createDefaultEnrichment(tool))
  };
}

function buildCategoryPage(category: GeneratedCategory, categoryTools: EnrichedTool[]): GeneratedPage {
  return {
    slug: category.slug,
    pageType: "category",
    category: category.slug,
    title: `${category.name}: Best Picks, Alternatives, and Buying Notes`,
    h1: category.name,
    metaDescription: `Explore ${category.name.toLowerCase()} with curated picks, editor notes, and internal comparisons.`,
    canonicalPath: `/categories/${category.slug}`,
    summary: category.description,
    sections: [
      {
        heading: "What this category covers",
        body: [category.description]
      },
      {
        heading: "Featured tools in this cluster",
        body: categoryTools.map((tool) => `${tool.name}: ${tool.summary}`)
      }
    ],
    faq: [
      {
        question: `How should you choose ${category.name.toLowerCase()}?`,
        answer: "Start with the workflow you need most, then compare pricing, editing quality, and integrations."
      }
    ],
    relatedLinks: categoryTools.slice(0, 3).map((tool) => ({
      label: tool.name,
      href: `/tools/${tool.slug}`
    })),
    adSlots: ["hero", "in-content"],
    qualityFlags: [],
    sourceToolSlugs: category.toolSlugs
  };
}

function buildToolPage(tool: EnrichedTool): GeneratedPage {
  const alternatives = tool.alternatives.slice(0, 2).map((slug) => ({
    label: `${tool.name} alternatives`,
    href: `/comparisons/${slugify(`${tool.slug}-alternatives`)}`
  }));

  return {
    slug: tool.slug,
    pageType: "tool",
    category: tool.category,
    title: `${tool.name} Review: Use Cases, Pricing, and Best Fits`,
    h1: `${tool.name} Review`,
    metaDescription: tool.metaDescription,
    canonicalPath: `/tools/${tool.slug}`,
    summary: tool.summary,
    sections: [
      {
        heading: "What the tool does well",
        body: tool.pros
      },
      {
        heading: "Where it needs scrutiny",
        body: tool.cons
      },
      {
        heading: "Best-fit workflows",
        body: tool.useCases
      }
    ],
    faq: tool.faq,
    relatedLinks: [
      {
        label: "Back to category",
        href: `/categories/${tool.category}`
      },
      ...tool.suggestedInternalLinks,
      ...alternatives
    ],
    adSlots: ["in-content", "sidebar"],
    qualityFlags: [],
    sourceToolSlugs: [tool.slug]
  };
}

function buildComparisonPage(tool: EnrichedTool, allTools: EnrichedTool[]): GeneratedPage | null {
  const alternativeSlug = tool.alternatives[0] ?? allTools.find((candidate) => candidate.slug !== tool.slug && candidate.category === tool.category)?.slug;
  if (!alternativeSlug) {
    return null;
  }

  const alternativeTool = allTools.find((candidate) => candidate.slug === alternativeSlug);
  if (!alternativeTool) {
    return null;
  }

  const slug = slugify(`${tool.slug}-alternatives`);
  return {
    slug,
    pageType: "comparison",
    category: tool.category,
    title: `Best Alternatives to ${tool.name}`,
    h1: `Best Alternatives to ${tool.name}`,
    metaDescription: `Compare ${tool.name} with strong alternatives for similar workflows.`,
    canonicalPath: `/comparisons/${slug}`,
    summary: `A short-list of alternatives to ${tool.name} when you need different pricing, workflow depth, or editing control.`,
    sections: [
      {
        heading: `Why teams switch from ${tool.name}`,
        body: tool.cons
      },
      {
        heading: `Top alternative: ${alternativeTool.name}`,
        body: alternativeTool.pros
      }
    ],
    faq: [
      {
        question: `Is ${alternativeTool.name} better than ${tool.name}?`,
        answer: `It depends on whether you prioritize ${alternativeTool.useCases[0]} over ${tool.useCases[0]}.`
      }
    ],
    relatedLinks: [
      {
        label: tool.name,
        href: `/tools/${tool.slug}`
      },
      {
        label: alternativeTool.name,
        href: `/tools/${alternativeTool.slug}`
      },
      {
        label: "Back to category",
        href: `/categories/${tool.category}`
      }
    ],
    adSlots: ["in-content", "sidebar"],
    qualityFlags: [],
    sourceToolSlugs: [tool.slug, alternativeTool.slug]
  };
}

function buildGuidePage(tool: EnrichedTool): GeneratedPage {
  const useCase = tool.useCases[0] ?? "real workflows";
  const slug = slugify(`how-to-use-${tool.slug}-for-${useCase}`);
  return {
    slug,
    pageType: "guide",
    category: tool.category,
    title: `How to Use ${tool.name} for ${useCase}`,
    h1: `How to Use ${tool.name} for ${useCase}`,
    metaDescription: `A practical walkthrough for using ${tool.name} in ${useCase}.`,
    canonicalPath: `/guides/${slug}`,
    summary: `A practical guide to using ${tool.name} for ${useCase}.`,
    sections: [
      {
        heading: "Set the workflow before prompting",
        body: [
          `Gather the inputs, constraints, and approval needs tied to ${useCase} before using ${tool.name}.`
        ]
      },
      {
        heading: "Draft with narrow instructions",
        body: [
          `Use ${tool.name} with clear audience, goal, and format constraints so the first draft stays usable.`
        ]
      },
      {
        heading: "Edit with product facts",
        body: [
          "Replace generic claims with pricing, features, proof points, and support promises that a real buyer would check."
        ]
      }
    ],
    faq: tool.faq,
    relatedLinks: [
      {
        label: tool.name,
        href: `/tools/${tool.slug}`
      },
      {
        label: "Back to category",
        href: `/categories/${tool.category}`
      }
    ],
    adSlots: ["in-content", "sidebar"],
    qualityFlags: [],
    sourceToolSlugs: [tool.slug]
  };
}

export function buildSiteBundle(input: {
  site: SiteConfig;
  categories: CategorySeed[];
  tools: ToolSeed[];
  enrichments: Record<string, ToolEnrichment>;
}): SiteBundle {
  validateToolCatalog({
    categories: input.categories,
    tools: input.tools
  });

  const tools = input.tools.map((tool) => mergeTool(tool, input.enrichments[tool.slug]));
  const categories: GeneratedCategory[] = input.categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    toolSlugs: tools.filter((tool) => tool.category === category.slug).map((tool) => tool.slug)
  }));

  const pages: GeneratedPage[] = [];

  for (const category of categories) {
    const categoryTools = tools.filter((tool) => tool.category === category.slug);
    pages.push(buildCategoryPage(category, categoryTools));
  }

  for (const tool of tools) {
    pages.push(buildToolPage(tool));

    const comparisonPage = buildComparisonPage(tool, tools);
    if (comparisonPage) {
      pages.push(comparisonPage);
    }

    pages.push(buildGuidePage(tool));
  }

  return {
    site: input.site,
    categories,
    tools,
    pages
  };
}
