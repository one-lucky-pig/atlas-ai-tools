import { describe, expect, test } from "vitest";

import { normalizePageOutput } from "../src/lib/factory/llm";
import type { GenerationTask } from "../src/lib/factory/types";

const task: GenerationTask = {
  pageType: "guide",
  keywordIntent: "how to use ai writing tools for product launch copy",
  tone: "helpful, editorial, and precise",
  seoConstraints: {
    minSections: 3,
    minInternalLinks: 2
  },
  source: {
    slug: "jasper",
    name: "Jasper",
    category: "ai-writing"
  }
};

describe("normalizePageOutput", () => {
  test("normalizes a complete provider payload into the shared page format", () => {
    const result = normalizePageOutput(task, {
      title: "How to Use Jasper for Product Launch Copy",
      metaDescription: "A practical guide to planning and editing launch copy with Jasper.",
      summary: "This guide explains how to shape launch messaging with Jasper.",
      canonicalPath: "/guides/use-jasper-for-launch-copy",
      sections: [
        {
          heading: "Define the launch angle first",
          body: [
            "Start by collecting customer pain points, differentiators, and proof points."
          ]
        },
        {
          heading: "Draft structured prompts",
          body: [
            "Feed Jasper the audience, value proposition, and conversion goal before asking for copy."
          ]
        },
        {
          heading: "Edit for specificity",
          body: [
            "Replace generic claims with feature details, pricing notes, or support promises."
          ]
        }
      ],
      faq: [
        {
          question: "Can Jasper replace a product marketer?",
          answer: "No. It speeds up ideation and drafting, but positioning still needs human judgment."
        }
      ],
      relatedLinks: [
        {
          label: "Best AI writing tools",
          href: "/categories/ai-writing"
        },
        {
          label: "Jasper alternatives",
          href: "/comparisons/jasper-alternatives"
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.title).toBe("How to Use Jasper for Product Launch Copy");
      expect(result.page.sections).toHaveLength(3);
      expect(result.page.relatedLinks).toHaveLength(2);
    }
  });

  test("marks incomplete provider payloads as retryable validation failures", () => {
    const result = normalizePageOutput(task, {
      title: "Incomplete page",
      metaDescription: "Too thin to publish.",
      summary: "Missing structure."
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
      expect(result.issues.join(" ")).toMatch(/sections/i);
    }
  });
});
