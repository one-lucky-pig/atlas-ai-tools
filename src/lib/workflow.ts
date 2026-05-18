import { slugify } from "./factory/utils";

export type TopicQueueStatus = "shortlisted" | "briefed" | "failed_fetch";
export type DraftQueueStatus =
  | "drafted"
  | "reviewed"
  | "approved"
  | "published"
  | "failed_generate"
  | "failed_review"
  | "failed_publish"
  | "briefed";

export interface TopicCandidate {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  heatScore: number;
  relevanceScore: number;
  riskFlags: string[];
  suggestedAngle: string;
}

export interface TopicQueueItem extends TopicCandidate {
  status: TopicQueueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSection {
  heading: string;
  paragraphs: string[];
}

export interface DraftLink {
  label: string;
  href: string;
}

export interface DraftCitation {
  label: string;
  url: string;
}

export interface DraftFaq {
  question: string;
  answer: string;
}

export interface DraftPackage {
  topicId: string;
  workingTitle: string;
  seoTitle: string;
  metaDescription: string;
  outline: string[];
  bodySections: DraftSection[];
  faq: DraftFaq[];
  internalLinks: DraftLink[];
  sourceCitations: DraftCitation[];
  qualityNotes: string[];
}

export interface DraftQueueItem extends TopicCandidate {
  topicId: string;
  status: DraftQueueStatus;
  createdAt: string;
  updatedAt: string;
  selected: boolean;
  reviewNotes: string[];
  draft: DraftPackage | null;
  publishedAt?: string;
  publishedSlug?: string;
  publishedCommit?: string;
}

export interface PublishedDispatch {
  id: string;
  topicId: string;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  summary: string;
  source: string;
  sourceUrl: string;
  suggestedAngle: string;
  publishedAt: string;
  updatedAt: string;
  bodySections: DraftSection[];
  faq: DraftFaq[];
  internalLinks: DraftLink[];
  sourceCitations: DraftCitation[];
}

export interface PublishLogEntry {
  id: string;
  draftIds: string[];
  status: "success" | "error";
  startedAt: string;
  finishedAt: string;
  commitHash?: string;
  message: string;
}

export interface AutomationSettings {
  enabled: boolean;
  intervalMinutes: number;
  fetchLimit: number;
  generateLimit: number;
  minHeatScore: number;
  minRelevanceScore: number;
}

export interface AutomationRunRecord {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "error";
  fetchedCount: number;
  shortlistedCount: number;
  generatedCount: number;
  message: string;
}

export interface AutomationState {
  settings: AutomationSettings;
  currentStatus: "idle" | "running" | "success" | "error";
  lastRunAt: string | null;
  recentRuns: AutomationRunRecord[];
}

export interface WorkflowOverview {
  counts: Record<string, number>;
  pendingPublish: number;
  lastPublishedAt: string | null;
  recentFailures: DraftQueueItem[];
}

export function createDefaultAutomationState(): AutomationState {
  return {
    settings: {
      enabled: false,
      intervalMinutes: 60,
      fetchLimit: 12,
      generateLimit: 4,
      minHeatScore: 50,
      minRelevanceScore: 50
    },
    currentStatus: "idle",
    lastRunAt: null,
    recentRuns: []
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function mergeTopicCandidates(
  existing: TopicCandidate[],
  incoming: TopicCandidate[]
): TopicCandidate[] {
  const next = new Map<string, TopicCandidate>();

  for (const candidate of [...existing, ...incoming]) {
    const dedupeKey = candidate.sourceUrl || `${candidate.source}:${candidate.title}`;
    if (!next.has(dedupeKey)) {
      next.set(dedupeKey, clone(candidate));
    }
  }

  return Array.from(next.values()).sort((left, right) => {
    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }

    return right.heatScore - left.heatScore;
  });
}

export function shortlistTopicCandidates(
  candidates: TopicCandidate[],
  queue: TopicQueueItem[],
  selectedIds: string[],
  timestamp: string
): {
  remainingCandidates: TopicCandidate[];
  queue: TopicQueueItem[];
} {
  const selected = new Set(selectedIds);
  const nextQueue = [...queue];
  const remainingCandidates: TopicCandidate[] = [];

  for (const candidate of candidates) {
    if (!selected.has(candidate.id)) {
      remainingCandidates.push(candidate);
      continue;
    }

    if (!nextQueue.some((item) => item.id === candidate.id)) {
      nextQueue.push({
        ...clone(candidate),
        status: "shortlisted",
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
  }

  return {
    remainingCandidates,
    queue: nextQueue
  };
}

export function createDraftQueueEntries(
  topicQueue: TopicQueueItem[],
  draftQueue: DraftQueueItem[],
  selectedIds: string[],
  timestamp: string
): DraftQueueItem[] {
  const selected = new Set(selectedIds);
  const nextQueue = [...draftQueue];

  for (const topic of topicQueue) {
    if (!selected.has(topic.id)) {
      continue;
    }

    if (nextQueue.some((item) => item.topicId === topic.id)) {
      continue;
    }

    nextQueue.push({
      ...clone(topic),
      topicId: topic.id,
      status: "briefed",
      createdAt: timestamp,
      updatedAt: timestamp,
      selected: false,
      reviewNotes: [],
      draft: null
    });
  }

  return nextQueue;
}

export function markTopicsBriefed(
  topicQueue: TopicQueueItem[],
  selectedIds: string[],
  timestamp: string
): TopicQueueItem[] {
  const selected = new Set(selectedIds);
  return topicQueue.map((item) =>
    selected.has(item.id) && item.status === "shortlisted"
      ? {
          ...item,
          status: "briefed",
          updatedAt: timestamp
        }
      : item
  );
}

export function applyGeneratedDraftPackages(
  draftQueue: DraftQueueItem[],
  drafts: DraftPackage[],
  timestamp: string
): DraftQueueItem[] {
  const byTopicId = new Map(drafts.map((draft) => [draft.topicId, draft]));

  return draftQueue.map((item) => {
    const draft = byTopicId.get(item.topicId);
    if (!draft) {
      return item;
    }

    return {
      ...item,
      status: "drafted",
      updatedAt: timestamp,
      draft: clone(draft),
      reviewNotes: []
    };
  });
}

export function computeDraftBlockingIssues(draft: DraftPackage | null): string[] {
  const issues: string[] = [];

  if (!draft) {
    return ["Draft payload is missing."];
  }

  if (!draft.workingTitle.trim()) {
    issues.push("Working title is required.");
  }

  if (!draft.seoTitle.trim()) {
    issues.push("SEO title is required.");
  }

  if (!draft.metaDescription.trim()) {
    issues.push("Meta description is required.");
  }

  if (!draft.bodySections.length) {
    issues.push("At least one body section is required.");
  }

  if (draft.bodySections.some((section) => !section.heading.trim())) {
    issues.push("Each section needs a heading.");
  }

  if (draft.bodySections.some((section) => !section.paragraphs.some((paragraph) => paragraph.trim()))) {
    issues.push("Each section needs body paragraphs.");
  }

  if (!draft.sourceCitations.length) {
    issues.push("At least one source citation is required.");
  }

  if (!draft.internalLinks.length) {
    issues.push("At least one internal link is required.");
  }

  return issues;
}

export function updateDraftReviewStatus(
  draftQueue: DraftQueueItem[],
  selectedIds: string[],
  action: "mark-reviewed" | "approve" | "reopen",
  timestamp: string
): DraftQueueItem[] {
  const selected = new Set(selectedIds);

  return draftQueue.map((item) => {
    if (!selected.has(item.id)) {
      return item;
    }

    if (action === "reopen") {
      return {
        ...item,
        status: "drafted",
        updatedAt: timestamp
      };
    }

    if (action === "mark-reviewed") {
      return {
        ...item,
        status: "reviewed",
        updatedAt: timestamp,
        reviewNotes: []
      };
    }

    const reviewIssues = computeDraftBlockingIssues(item.draft);
    if (reviewIssues.length > 0) {
      return {
        ...item,
        status: "failed_review",
        updatedAt: timestamp,
        reviewNotes: reviewIssues
      };
    }

    return {
      ...item,
      status: "approved",
      updatedAt: timestamp,
      reviewNotes: []
    };
  });
}

function makeUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  let nextSlug = baseSlug;
  let counter = 2;

  while (existingSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  existingSlugs.add(nextSlug);
  return nextSlug;
}

export function createPublishedDispatches(
  draftQueue: DraftQueueItem[],
  existing: PublishedDispatch[],
  selectedIds: string[],
  timestamp: string
): {
  published: PublishedDispatch[];
  remainingDrafts: DraftQueueItem[];
} {
  const selected = new Set(selectedIds);
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const published = [...existing];

  const remainingDrafts = draftQueue.map((item) => {
    if (!selected.has(item.id) || item.status !== "approved" || !item.draft) {
      return item;
    }

    const slug = makeUniqueSlug(slugify(item.draft.workingTitle || item.title), existingSlugs);
    published.push({
      id: `dispatch-${item.id}`,
      topicId: item.topicId,
      slug,
      title: item.draft.workingTitle,
      seoTitle: item.draft.seoTitle,
      metaDescription: item.draft.metaDescription,
      summary: item.summary,
      source: item.source,
      sourceUrl: item.sourceUrl,
      suggestedAngle: item.suggestedAngle,
      publishedAt: timestamp,
      updatedAt: timestamp,
      bodySections: clone(item.draft.bodySections),
      faq: clone(item.draft.faq),
      internalLinks: clone(item.draft.internalLinks),
      sourceCitations: clone(item.draft.sourceCitations)
    });

    return {
      ...item,
      status: "published" as const,
      updatedAt: timestamp,
      publishedAt: timestamp,
      publishedSlug: slug
    };
  });

  return {
    published,
    remainingDrafts
  };
}

export function buildWorkflowOverview(input: {
  candidates: TopicCandidate[];
  topicQueue: TopicQueueItem[];
  draftQueue: DraftQueueItem[];
  publishLog: PublishLogEntry[];
}): WorkflowOverview {
  const counts: Record<string, number> = {
    fetched: input.candidates.length,
    shortlisted: 0,
    briefed: 0,
    drafted: 0,
    reviewed: 0,
    approved: 0,
    published: 0,
    failed_fetch: 0,
    failed_generate: 0,
    failed_review: 0,
    failed_publish: 0
  };

  for (const topic of input.topicQueue) {
    counts[topic.status] = (counts[topic.status] ?? 0) + 1;
  }

  for (const draft of input.draftQueue) {
    counts[draft.status] = (counts[draft.status] ?? 0) + 1;
  }

  const recentFailures = input.draftQueue.filter((draft) =>
    ["failed_generate", "failed_review", "failed_publish"].includes(draft.status)
  );

  const publishedDrafts = input.draftQueue
    .filter((draft) => draft.status === "published" && draft.publishedAt)
    .sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));

  return {
    counts,
    pendingPublish: input.draftQueue.filter((draft) => draft.status === "approved").length,
    lastPublishedAt: publishedDrafts[0]?.publishedAt ?? null,
    recentFailures
  };
}
