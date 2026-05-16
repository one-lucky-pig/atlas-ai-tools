import { describe, expect, test } from "vitest";

import {
  createEmptyEnrichment,
  draftToEnrichment,
  enrichmentToDraft
} from "../src/lib/studio";
import type { ToolEnrichment } from "../src/lib/factory/types";

const enrichment: ToolEnrichment = {
  summary: "Jasper helps teams draft launch copy and campaign assets.",
  pros: ["Useful campaign templates", "Brand voice controls"],
  cons: ["Needs human editing"],
  alternatives: ["copy-ai", "writesonic"],
  faq: [
    {
      question: "Is Jasper good for product launches?",
      answer: "It is useful for drafting, but positioning still needs human review."
    }
  ],
  metaDescription: "Review Jasper for launch copy, campaign planning, and team workflows.",
  editorialAngles: ["launch copy", "campaign planning"],
  suggestedInternalLinks: [
    { label: "AI writing tools", href: "/categories/ai-writing" },
    { label: "Jasper alternatives", href: "/comparisons/jasper-alternatives" }
  ]
};

describe("studio enrichment draft helpers", () => {
  test("creates an empty enrichment payload", () => {
    const empty = createEmptyEnrichment();

    expect(empty.summary).toBe("");
    expect(empty.pros).toEqual([]);
    expect(empty.suggestedInternalLinks).toEqual([]);
  });

  test("converts enrichment to editable draft fields", () => {
    const draft = enrichmentToDraft(enrichment);

    expect(draft.summary).toContain("Jasper");
    expect(draft.prosText).toContain("Useful campaign templates");
    expect(draft.suggestedLinksText).toContain("AI writing tools | /categories/ai-writing");
    expect(draft.faqText).toContain("Is Jasper good for product launches?");
  });

  test("round-trips enrichment through draft text fields", () => {
    const draft = enrichmentToDraft(enrichment);
    const restored = draftToEnrichment(draft);

    expect(restored).toEqual(enrichment);
  });
});
