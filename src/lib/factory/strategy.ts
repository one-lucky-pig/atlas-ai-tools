import type { PublishingDecision, PublishingMetrics } from "./types";

export function decidePublishingAction(metrics: PublishingMetrics): PublishingDecision {
  const indexRate = metrics.publishedPages === 0 ? 0 : metrics.indexedPages / metrics.publishedPages;
  const impressionCoverage = metrics.indexedPages === 0 ? 0 : metrics.pagesWithImpressions / metrics.indexedPages;

  if (metrics.lowQualitySampleRate >= 0.25) {
    return {
      category: metrics.category,
      action: "pause_template",
      reason: `Sample quality fell below threshold for ${metrics.category}.`
    };
  }

  if (metrics.observationWindowDays >= 7 && metrics.publishedPages >= 10 && indexRate < 0.2) {
    return {
      category: metrics.category,
      action: "slow_down",
      reason: `Indexing rate is too low for ${metrics.category}.`
    };
  }

  if (metrics.observationWindowDays >= 21 && indexRate >= 0.5 && impressionCoverage < 0.2) {
    return {
      category: metrics.category,
      action: "refresh_titles_and_links",
      reason: `Indexed pages are not earning enough impressions in ${metrics.category}.`
    };
  }

  return {
    category: metrics.category,
    action: "keep_publishing",
    reason: `Publishing metrics for ${metrics.category} are within range.`
  };
}
