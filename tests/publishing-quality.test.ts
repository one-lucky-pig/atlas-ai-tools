import { describe, expect, test } from "vitest";

import { evaluatePageQuality } from "../src/lib/factory/quality";
import type { GeneratedPage } from "../src/lib/factory/types";

const basePage: GeneratedPage = {
  slug: "how-to-use-jasper-for-launch-copy",
  pageType: "guide",
  category: "ai-writing",
  title: "How to Use Jasper for Product Launch Copy",
  h1: "How to Use Jasper for Product Launch Copy",
  metaDescription: "A hands-on guide to building sharper launch copy with Jasper.",
  canonicalPath: "/guides/how-to-use-jasper-for-launch-copy",
  summary: "A field guide for shaping and editing launch copy with Jasper.",
  sections: [
    {
      heading: "Define the offer and angle",
      body: [
        "Collect product differentiators, objections, pricing context, and proof before prompting the model."
      ]
    },
    {
      heading: "Generate controlled drafts",
      body: [
        "Prompt with audience, objective, CTA, and channel-specific constraints to reduce generic copy."
      ]
    },
    {
      heading: "Edit with product facts",
      body: [
        "Replace vague claims with metrics, timelines, and feature details so the page earns trust."
      ]
    }
  ],
  faq: [
    {
      question: "Should you publish Jasper output without editing?",
      answer: "No. Always add real product facts and specific claims before publishing."
    }
  ],
  relatedLinks: [
    {
      label: "AI Writing Tools",
      href: "/categories/ai-writing"
    },
    {
      label: "Jasper alternatives",
      href: "/comparisons/jasper-alternatives"
    }
  ],
  adSlots: ["in-content", "sidebar"],
  qualityFlags: [],
  sourceToolSlugs: ["jasper"]
};

describe("evaluatePageQuality", () => {
  test("passes pages that contain required metadata, internal links, and sections", () => {
    const result = evaluatePageQuality(basePage, new Set());

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("fails pages that still contain placeholders or lack internal links", () => {
    const result = evaluatePageQuality(
      {
        ...basePage,
        summary: "TODO summary",
        relatedLinks: []
      },
      new Set()
    );

    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toMatch(/placeholder/i);
    expect(result.issues.join(" ")).toMatch(/internal link/i);
  });

  test("fails pages whose title collides with an existing page", () => {
    const result = evaluatePageQuality(basePage, new Set([basePage.title]));

    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toMatch(/duplicate title/i);
  });
});
