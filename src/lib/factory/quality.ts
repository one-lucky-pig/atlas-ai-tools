import type { GeneratedPage } from "./types";
import { hasPlaceholderText } from "./utils";

export function evaluatePageQuality(page: GeneratedPage, existingTitles: Set<string>): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const requiredText = [page.title, page.h1, page.metaDescription, page.summary, page.canonicalPath];
  if (requiredText.some((value) => value.trim().length === 0)) {
    issues.push("Missing required metadata");
  }

  const haystack = [
    page.title,
    page.h1,
    page.metaDescription,
    page.summary,
    ...page.sections.map((section) => section.heading),
    ...page.sections.flatMap((section) => section.body)
  ];

  if (haystack.some((value) => hasPlaceholderText(value))) {
    issues.push("Page still contains placeholder text");
  }

  if (page.relatedLinks.length === 0) {
    issues.push("Page needs at least one internal link");
  }

  if (page.sections.length === 0) {
    issues.push("Page needs at least one section");
  }

  if (existingTitles.has(page.title)) {
    issues.push("Duplicate title: page title collides with an existing title");
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
