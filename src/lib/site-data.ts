import siteBundle from "../../data/generated/site-bundle.json";
import type { GeneratedCategory, GeneratedPage, PageType, SiteBundle } from "./factory/types";

const bundle = siteBundle as SiteBundle;

export const site = bundle.site;
export const categories = bundle.categories;
export const tools = bundle.tools;
export const pages = bundle.pages;

export function getPagesByType(pageType: PageType): GeneratedPage[] {
  return pages.filter((page) => page.pageType === pageType);
}

export function getCategoryBySlug(slug: string): GeneratedCategory | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}

export function getPageBySlug(pageType: PageType, slug: string): GeneratedPage | undefined {
  return pages.find((page) => page.pageType === pageType && page.slug === slug);
}

export function getCategoryPages(slug: string, pageType?: Exclude<PageType, "category">): GeneratedPage[] {
  return pages.filter((page) => {
    if (page.category !== slug) {
      return false;
    }

    if (!pageType) {
      return true;
    }

    return page.pageType === pageType;
  });
}

export function getFeaturedPages(limit = 4): {
  tools: GeneratedPage[];
  comparisons: GeneratedPage[];
  guides: GeneratedPage[];
} {
  return {
    tools: getPagesByType("tool").slice(0, limit),
    comparisons: getPagesByType("comparison").slice(0, limit),
    guides: getPagesByType("guide").slice(0, limit)
  };
}
