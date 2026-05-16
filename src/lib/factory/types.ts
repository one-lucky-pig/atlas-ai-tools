export type PageType = "category" | "tool" | "comparison" | "guide";

export type AdSlot = "hero" | "in-content" | "sidebar";

export interface CategorySeed {
  slug: string;
  name: string;
  description: string;
}

export interface ToolSeed {
  slug: string;
  name: string;
  category: string;
  subcategories: string[];
  officialUrl: string;
  pricingModel: string;
  coreFeatures: string[];
  useCases: string[];
  targetUsers: string[];
}

export interface ToolEnrichment {
  summary: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  metaDescription: string;
  editorialAngles: string[];
  suggestedInternalLinks: Array<{
    label: string;
    href: string;
  }>;
}

export type EnrichedTool = ToolSeed & ToolEnrichment;

export interface GeneratedSection {
  heading: string;
  body: string[];
}

export interface RelatedLink {
  label: string;
  href: string;
}

export interface GeneratedPage {
  slug: string;
  pageType: PageType;
  category: string;
  title: string;
  h1: string;
  metaDescription: string;
  canonicalPath: string;
  summary: string;
  sections: GeneratedSection[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  relatedLinks: RelatedLink[];
  adSlots: AdSlot[];
  qualityFlags: string[];
  sourceToolSlugs: string[];
}

export interface GeneratedCategory {
  slug: string;
  name: string;
  description: string;
  toolSlugs: string[];
}

export interface SiteConfig {
  name: string;
  domain: string;
  url: string;
  description: string;
  contactEmail?: string;
  legalEntity?: string;
}

export interface GenerationTask {
  pageType: Exclude<PageType, "category">;
  keywordIntent: string;
  tone: string;
  seoConstraints: {
    minSections: number;
    minInternalLinks: number;
  };
  source: {
    slug: string;
    name: string;
    category: string;
  };
}

export interface PublishingMetrics {
  category: string;
  indexedPages: number;
  publishedPages: number;
  lowQualitySampleRate: number;
  pagesWithImpressions: number;
  observationWindowDays: number;
}

export type PublishingAction =
  | "keep_publishing"
  | "slow_down"
  | "pause_template"
  | "refresh_titles_and_links";

export interface PublishingDecision {
  category: string;
  action: PublishingAction;
  reason: string;
}

export interface SuccessfulNormalization {
  ok: true;
  page: GeneratedPage;
}

export interface FailedNormalization {
  ok: false;
  retryable: boolean;
  issues: string[];
}

export type NormalizationResult = SuccessfulNormalization | FailedNormalization;

export interface SiteBundle {
  site: SiteConfig;
  categories: GeneratedCategory[];
  tools: EnrichedTool[];
  pages: GeneratedPage[];
}
