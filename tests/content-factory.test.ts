import { describe, expect, test } from "vitest";

import { buildSiteBundle } from "../src/lib/factory/content-factory";
import type { CategorySeed, ToolEnrichment, ToolSeed } from "../src/lib/factory/types";

const categories: CategorySeed[] = [
  {
    slug: "ai-writing",
    name: "AI Writing Tools",
    description: "Tools for writing articles, landing pages, and email sequences."
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
    coreFeatures: ["brand voice", "campaign generation"],
    useCases: ["landing pages", "product marketing"],
    targetUsers: ["marketers"]
  },
  {
    slug: "copy-ai",
    name: "Copy.ai",
    category: "ai-writing",
    subcategories: ["copywriting"],
    officialUrl: "https://www.copy.ai",
    pricingModel: "freemium",
    coreFeatures: ["workflow templates", "prospecting copy"],
    useCases: ["email outreach", "product marketing"],
    targetUsers: ["sales teams"]
  }
];

const enrichments: Record<string, ToolEnrichment> = {
  jasper: {
    summary: "Jasper helps marketing teams draft and refine conversion-oriented campaign copy.",
    pros: ["Strong campaign templates", "Useful brand voice controls"],
    cons: ["Needs heavy editing for technical claims"],
    alternatives: ["copy-ai"],
    faq: [
      {
        question: "Is Jasper good for product launches?",
        answer: "It is a strong drafting tool, but the final positioning still needs human review."
      }
    ],
    metaDescription: "See where Jasper fits for campaign planning and launch copy.",
    editorialAngles: ["launch copy", "campaign planning"],
    suggestedInternalLinks: [
      {
        label: "AI writing tools",
        href: "/categories/ai-writing"
      }
    ]
  },
  "copy-ai": {
    summary: "Copy.ai focuses on fast workflows for outbound messaging and marketing ideas.",
    pros: ["Fast ideation", "Useful templates for outreach"],
    cons: ["Can produce repetitive phrasing"],
    alternatives: ["jasper"],
    faq: [
      {
        question: "Is Copy.ai better for sales than Jasper?",
        answer: "It often suits fast outreach workflows better, while Jasper leans broader for campaign drafting."
      }
    ],
    metaDescription: "A practical look at Copy.ai for outreach and campaign drafting.",
    editorialAngles: ["sales outreach", "marketing workflows"],
    suggestedInternalLinks: [
      {
        label: "Copy.ai alternatives",
        href: "/comparisons/copy-ai-alternatives"
      }
    ]
  }
};

describe("buildSiteBundle", () => {
  test("builds a category, tool, comparison, and guide cluster from tool seeds", () => {
    const bundle = buildSiteBundle({
      site: {
        name: "Atlas AI Tools",
        domain: "example.com",
        url: "https://example.com",
        description: "Editorial AI tools directory for practical software comparisons."
      },
      categories,
      tools,
      enrichments
    });

    expect(bundle.categories).toHaveLength(1);
    expect(bundle.pages.filter((page) => page.pageType === "tool")).toHaveLength(2);
    expect(bundle.pages.some((page) => page.pageType === "comparison")).toBe(true);
    expect(bundle.pages.some((page) => page.pageType === "guide")).toBe(true);
    expect(bundle.pages.some((page) => page.pageType === "category")).toBe(true);
  });
});
