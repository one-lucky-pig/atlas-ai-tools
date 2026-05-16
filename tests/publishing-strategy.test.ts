import { describe, expect, test } from "vitest";

import { decidePublishingAction } from "../src/lib/factory/strategy";

describe("decidePublishingAction", () => {
  test("slows a category when indexing rate remains too low", () => {
    const result = decidePublishingAction({
      category: "ai-writing",
      indexedPages: 2,
      publishedPages: 30,
      lowQualitySampleRate: 0.05,
      pagesWithImpressions: 8,
      observationWindowDays: 14
    });

    expect(result.action).toBe("slow_down");
    expect(result.category).toBe("ai-writing");
  });

  test("pauses a template when sample quality falls below threshold", () => {
    const result = decidePublishingAction({
      category: "ai-video",
      indexedPages: 10,
      publishedPages: 20,
      lowQualitySampleRate: 0.4,
      pagesWithImpressions: 12,
      observationWindowDays: 14
    });

    expect(result.action).toBe("pause_template");
    expect(result.category).toBe("ai-video");
  });

  test("recommends title and link refresh when pages publish but attract no impressions", () => {
    const result = decidePublishingAction({
      category: "ai-productivity",
      indexedPages: 14,
      publishedPages: 16,
      lowQualitySampleRate: 0.1,
      pagesWithImpressions: 1,
      observationWindowDays: 30
    });

    expect(result.action).toBe("refresh_titles_and_links");
    expect(result.category).toBe("ai-productivity");
  });
});
