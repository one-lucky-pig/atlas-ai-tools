import type { CategorySeed, SiteConfig, ToolEnrichment, ToolSeed } from "./factory/types";
import { validateToolCatalog } from "./factory/validation";

export interface StudioState {
  site: SiteConfig;
  categories: CategorySeed[];
  tools: ToolSeed[];
  enrichments?: Record<string, ToolEnrichment>;
}

export type StudioImportKey = "site" | "categories" | "tools" | "enrichments";

export interface StudioReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface StudioEnrichmentDraft {
  summary: string;
  metaDescription: string;
  prosText: string;
  consText: string;
  alternativesText: string;
  editorialAnglesText: string;
  faqText: string;
  suggestedLinksText: string;
}

export function createStudioState(input: StudioState): StudioState {
  const cloned = JSON.parse(JSON.stringify(input)) as StudioState;
  return {
    ...cloned,
    enrichments: cloned.enrichments ?? {}
  };
}

export function createEmptyCategory(): CategorySeed {
  return {
    slug: "",
    name: "",
    description: ""
  };
}

export function createEmptyTool(category = ""): ToolSeed {
  return {
    slug: "",
    name: "",
    category,
    subcategories: [""],
    officialUrl: "",
    pricingModel: "",
    coreFeatures: [""],
    useCases: [""],
    targetUsers: [""]
  };
}

export function createEmptyEnrichment(): ToolEnrichment {
  return {
    summary: "",
    pros: [],
    cons: [],
    alternatives: [],
    faq: [],
    metaDescription: "",
    editorialAngles: [],
    suggestedInternalLinks: []
  };
}

export function getStudioValidationIssues(state: StudioState): string[] {
  const issues: string[] = [];

  try {
    validateToolCatalog({
      categories: state.categories,
      tools: state.tools
    });
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  if (!state.site.name.trim()) {
    issues.push("Site name is required.");
  }

  if (!state.site.url.trim()) {
    issues.push("Site URL is required.");
  }

  return issues;
}

export function serializeStudioExport(state: StudioState): {
  site: string;
  categories: string;
  tools: string;
  enrichments: string;
} {
  return {
    site: JSON.stringify(state.site, null, 2),
    categories: JSON.stringify(state.categories, null, 2),
    tools: JSON.stringify(state.tools, null, 2),
    enrichments: JSON.stringify(state.enrichments ?? {}, null, 2)
  };
}

export function parseStudioImportJson(kind: "site", raw: string): SiteConfig;
export function parseStudioImportJson(kind: "categories", raw: string): CategorySeed[];
export function parseStudioImportJson(kind: "tools", raw: string): ToolSeed[];
export function parseStudioImportJson(kind: "enrichments", raw: string): Record<string, ToolEnrichment>;
export function parseStudioImportJson(kind: StudioImportKey, raw: string) {
  const parsed = JSON.parse(raw);

  if (kind === "site") {
    const site = parsed as Partial<SiteConfig>;
    if (
      typeof site !== "object" ||
      !site ||
      typeof site.name !== "string" ||
      typeof site.domain !== "string" ||
      typeof site.url !== "string" ||
      typeof site.description !== "string"
    ) {
      throw new Error("Invalid site JSON.");
    }

    if (
      typeof site.googleSiteVerification !== "undefined" &&
      typeof site.googleSiteVerification !== "string"
    ) {
      throw new Error("Invalid site JSON.");
    }

    if (typeof site.adsensePublisherId !== "undefined" && typeof site.adsensePublisherId !== "string") {
      throw new Error("Invalid site JSON.");
    }

    return site as SiteConfig;
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid ${kind} JSON: expected an array.`);
  }

  if (kind === "categories") {
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.slug !== "string" ||
        typeof item.name !== "string" ||
        typeof item.description !== "string"
      ) {
        throw new Error("Invalid categories JSON.");
      }
    }

    return parsed as CategorySeed[];
  }

  if (kind === "enrichments") {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid enrichments JSON: expected an object.");
    }

    for (const value of Object.values(parsed)) {
      if (
        !value ||
        typeof value !== "object" ||
        typeof (value as ToolEnrichment).summary !== "string" ||
        !Array.isArray((value as ToolEnrichment).pros) ||
        !Array.isArray((value as ToolEnrichment).cons) ||
        !Array.isArray((value as ToolEnrichment).alternatives) ||
        !Array.isArray((value as ToolEnrichment).faq) ||
        typeof (value as ToolEnrichment).metaDescription !== "string" ||
        !Array.isArray((value as ToolEnrichment).editorialAngles) ||
        !Array.isArray((value as ToolEnrichment).suggestedInternalLinks)
      ) {
        throw new Error("Invalid enrichments JSON.");
      }
    }

    return parsed as Record<string, ToolEnrichment>;
  }

  for (const item of parsed) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.slug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      !Array.isArray(item.subcategories) ||
      typeof item.officialUrl !== "string" ||
      typeof item.pricingModel !== "string" ||
      !Array.isArray(item.coreFeatures) ||
      !Array.isArray(item.useCases) ||
      !Array.isArray(item.targetUsers)
    ) {
      throw new Error("Invalid tools JSON.");
    }
  }

  return parsed as ToolSeed[];
}

export function parseBulkToolRows(raw: string, fallbackCategory = ""): ToolSeed[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.includes("|")
        ? line.split("|").map((item) => item.trim())
        : line.split("\t").map((item) => item.trim());

      const [
        name = "",
        slug = "",
        category = "",
        officialUrl = "",
        pricingModel = "",
        subcategories = "",
        coreFeatures = "",
        useCases = "",
        targetUsers = ""
      ] = columns;

      const parseList = (value: string) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

      return {
        slug,
        name,
        category: category || fallbackCategory,
        officialUrl,
        pricingModel,
        subcategories: parseList(subcategories),
        coreFeatures: parseList(coreFeatures),
        useCases: parseList(useCases),
        targetUsers: parseList(targetUsers)
      } satisfies ToolSeed;
    });
}

export function buildStudioReadinessChecks(state: StudioState): StudioReadinessCheck[] {
  const siteUrl = state.site.url.toLowerCase();
  const siteDomain = state.site.domain.toLowerCase();
  const contactEmail = (state.site.contactEmail ?? "").toLowerCase();

  return [
    {
      key: "production-domain",
      label: "生产域名",
      ok: !siteUrl.includes("example.com") && !siteDomain.includes("example.com"),
      detail: !siteUrl.includes("example.com") && !siteDomain.includes("example.com")
        ? "已替换默认示例域名。"
        : "还在使用 example.com，正式部署前需要替换。"
    },
    {
      key: "contact-email",
      label: "联系邮箱",
      ok: Boolean(contactEmail) && !contactEmail.includes("example.com"),
      detail: Boolean(contactEmail) && !contactEmail.includes("example.com")
        ? "联系邮箱已配置为可用地址。"
        : "联系邮箱仍是示例地址，送审前需要替换。"
    },
    {
      key: "adsense-publisher",
      label: "AdSense 发布商 ID",
      ok: Boolean((state.site.adsensePublisherId ?? "").trim()),
      detail: Boolean((state.site.adsensePublisherId ?? "").trim())
        ? "已配置 AdSense 发布商 ID。"
        : "还没有填写 AdSense 发布商 ID。"
    },
    {
      key: "gsc-verification",
      label: "GSC 验证码",
      ok: Boolean((state.site.googleSiteVerification ?? "").trim()),
      detail: Boolean((state.site.googleSiteVerification ?? "").trim())
        ? "已配置 Search Console 验证码。"
        : "还没有填写 Search Console 验证码。"
    },
    {
      key: "categories-present",
      label: "分类数量",
      ok: state.categories.length > 0,
      detail: state.categories.length > 0 ? `当前有 ${state.categories.length} 个分类。` : "还没有分类。"
    },
    {
      key: "tools-present",
      label: "工具数量",
      ok: state.tools.length > 0,
      detail: state.tools.length > 0 ? `当前有 ${state.tools.length} 个工具。` : "还没有工具种子。"
    }
  ];
}

function listToText(value: string[]): string {
  return value.join("\n");
}

function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function enrichmentToDraft(enrichment: ToolEnrichment): StudioEnrichmentDraft {
  return {
    summary: enrichment.summary,
    metaDescription: enrichment.metaDescription,
    prosText: listToText(enrichment.pros),
    consText: listToText(enrichment.cons),
    alternativesText: listToText(enrichment.alternatives),
    editorialAnglesText: listToText(enrichment.editorialAngles),
    faqText: enrichment.faq.map((item) => `${item.question} | ${item.answer}`).join("\n"),
    suggestedLinksText: enrichment.suggestedInternalLinks
      .map((item) => `${item.label} | ${item.href}`)
      .join("\n")
  };
}

export function draftToEnrichment(draft: StudioEnrichmentDraft): ToolEnrichment {
  return {
    summary: draft.summary.trim(),
    metaDescription: draft.metaDescription.trim(),
    pros: textToList(draft.prosText),
    cons: textToList(draft.consText),
    alternatives: textToList(draft.alternativesText),
    editorialAngles: textToList(draft.editorialAnglesText),
    faq: textToList(draft.faqText).map((line) => {
      const [question = "", answer = ""] = line.split("|").map((item) => item.trim());
      return { question, answer };
    }),
    suggestedInternalLinks: textToList(draft.suggestedLinksText).map((line) => {
      const [label = "", href = ""] = line.split("|").map((item) => item.trim());
      return { label, href };
    })
  };
}
