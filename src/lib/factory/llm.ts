import type { GeneratedPage, GenerationTask, NormalizationResult, RelatedLink } from "./types";
import { slugify } from "./utils";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSection(value: unknown): value is GeneratedPage["sections"][number] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { heading?: unknown; body?: unknown };
  return (
    isNonEmptyString(candidate.heading) &&
    Array.isArray(candidate.body) &&
    candidate.body.every((item) => isNonEmptyString(item))
  );
}

function isRelatedLink(value: unknown): value is RelatedLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { label?: unknown; href?: unknown };
  return isNonEmptyString(candidate.label) && isNonEmptyString(candidate.href);
}

export function normalizePageOutput(task: GenerationTask, payload: unknown): NormalizationResult {
  const candidate = payload as Record<string, unknown>;
  const issues: string[] = [];

  if (!isNonEmptyString(candidate?.title)) {
    issues.push("Missing title");
  }

  if (!isNonEmptyString(candidate?.metaDescription)) {
    issues.push("Missing meta description");
  }

  if (!isNonEmptyString(candidate?.summary)) {
    issues.push("Missing summary");
  }

  if (!Array.isArray(candidate?.sections) || candidate.sections.some((section) => !isSection(section))) {
    issues.push("Missing or invalid sections");
  } else if (candidate.sections.length < task.seoConstraints.minSections) {
    issues.push(`Expected at least ${task.seoConstraints.minSections} sections`);
  }

  const relatedLinks = Array.isArray(candidate?.relatedLinks)
    ? candidate.relatedLinks.filter((item): item is RelatedLink => isRelatedLink(item))
    : [];

  if (relatedLinks.length < task.seoConstraints.minInternalLinks) {
    issues.push(`Expected at least ${task.seoConstraints.minInternalLinks} internal links`);
  }

  if (
    !Array.isArray(candidate?.faq) ||
    candidate.faq.some((item) => !item || typeof item !== "object" || !isNonEmptyString((item as { question?: unknown }).question) || !isNonEmptyString((item as { answer?: unknown }).answer))
  ) {
    issues.push("Missing or invalid FAQ");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      retryable: true,
      issues
    };
  }

  const title = String(candidate.title);
  const canonicalPath = isNonEmptyString(candidate.canonicalPath)
    ? candidate.canonicalPath
    : `/${task.pageType}s/${slugify(title)}`;

  const page: GeneratedPage = {
    slug: canonicalPath.split("/").filter(Boolean).at(-1) ?? slugify(title),
    pageType: task.pageType,
    category: task.source.category,
    title,
    h1: isNonEmptyString(candidate.h1) ? candidate.h1 : title,
    metaDescription: String(candidate.metaDescription),
    canonicalPath,
    summary: String(candidate.summary),
    sections: candidate.sections as GeneratedPage["sections"],
    faq: candidate.faq as GeneratedPage["faq"],
    relatedLinks,
    adSlots: ["in-content", "sidebar"],
    qualityFlags: [],
    sourceToolSlugs: [task.source.slug]
  };

  return {
    ok: true,
    page
  };
}
