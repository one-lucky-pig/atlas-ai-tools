import { describe, expect, test } from "vitest";

import {
  applyGeneratedDraftPackages,
  buildWorkflowOverview,
  computeDraftBlockingIssues,
  createDefaultAutomationState,
  createDraftQueueEntries,
  createPublishedDispatches,
  markTopicsBriefed,
  shortlistTopicCandidates,
  type DraftPackage,
  type DraftQueueItem,
  type PublishedDispatch,
  type TopicCandidate,
  type TopicQueueItem,
  updateDraftReviewStatus
} from "../src/lib/workflow";

const fetchedAt = "2026-05-18T01:00:00.000Z";
const updatedAt = "2026-05-18T02:00:00.000Z";

function topicCandidate(overrides: Partial<TopicCandidate> = {}): TopicCandidate {
  return {
    id: "topic-1",
    title: "OpenAI launches a new coding workflow",
    summary: "A product launch for coding workflows.",
    source: "Product Hunt",
    sourceUrl: "https://example.com/topic-1",
    fetchedAt,
    heatScore: 81,
    relevanceScore: 92,
    riskFlags: [],
    suggestedAngle: "What the launch means for developers",
    ...overrides
  };
}

function draftPackage(overrides: Partial<DraftPackage> = {}): DraftPackage {
  return {
    topicId: "topic-1",
    workingTitle: "OpenAI launches a new coding workflow",
    seoTitle: "OpenAI launches a new coding workflow for developers",
    metaDescription: "What changed, why it matters, and how teams should evaluate it.",
    outline: ["What shipped", "Why it matters", "What to watch"],
    bodySections: [
      {
        heading: "What shipped",
        paragraphs: ["The launch adds a new workflow for engineering teams."]
      },
      {
        heading: "Why it matters",
        paragraphs: ["It could change how teams evaluate code assistants."]
      }
    ],
    faq: [
      {
        question: "What changed?",
        answer: "A new workflow was launched."
      }
    ],
    internalLinks: [
      {
        label: "Best AI developer tools",
        href: "/categories/ai-developer"
      }
    ],
    sourceCitations: [
      {
        label: "Official announcement",
        url: "https://example.com/topic-1"
      }
    ],
    qualityNotes: ["Includes source link."],
    ...overrides
  };
}

function approvedDraft(overrides: Partial<DraftQueueItem> = {}): DraftQueueItem {
  return {
    id: "draft-1",
    topicId: "topic-1",
    title: "OpenAI launches a new coding workflow",
    summary: "A product launch for coding workflows.",
    source: "Product Hunt",
    sourceUrl: "https://example.com/topic-1",
    fetchedAt,
    heatScore: 81,
    relevanceScore: 92,
    riskFlags: [],
    suggestedAngle: "What the launch means for developers",
    status: "approved",
    createdAt: fetchedAt,
    updatedAt,
    selected: false,
    reviewNotes: [],
    draft: draftPackage(),
    ...overrides
  };
}

describe("workflow state helpers", () => {
  test("shortlists selected fetched topics and removes them from candidate pool", () => {
    const { remainingCandidates, queue } = shortlistTopicCandidates(
      [topicCandidate(), topicCandidate({ id: "topic-2", sourceUrl: "https://example.com/topic-2" })],
      [],
      ["topic-1"],
      updatedAt
    );

    expect(remainingCandidates).toHaveLength(1);
    expect(remainingCandidates[0].id).toBe("topic-2");
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("topic-1");
    expect(queue[0].status).toBe("shortlisted");
  });

  test("creates briefed draft queue entries from shortlisted topics", () => {
    const shortlisted: TopicQueueItem[] = [
      {
        ...topicCandidate(),
        status: "shortlisted",
        createdAt: fetchedAt,
        updatedAt: fetchedAt
      }
    ];

    const queue = createDraftQueueEntries(shortlisted, [], ["topic-1"], updatedAt);

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("briefed");
    expect(queue[0].topicId).toBe("topic-1");
  });

  test("marks shortlisted topic queue items as briefed before draft generation", () => {
    const nextQueue = markTopicsBriefed(
      [
        {
          ...topicCandidate(),
          status: "shortlisted",
          createdAt: fetchedAt,
          updatedAt: fetchedAt
        }
      ],
      ["topic-1"],
      updatedAt
    );

    expect(nextQueue[0].status).toBe("briefed");
    expect(nextQueue[0].updatedAt).toBe(updatedAt);
  });

  test("applies generated draft packages and marks matching entries as drafted", () => {
    const draftQueue: DraftQueueItem[] = [
      {
        ...approvedDraft(),
        status: "briefed",
        draft: null
      }
    ];

    const nextQueue = applyGeneratedDraftPackages(draftQueue, [draftPackage()], updatedAt);

    expect(nextQueue[0].status).toBe("drafted");
    expect(nextQueue[0].draft?.seoTitle).toContain("developers");
  });

  test("blocks approval when a draft is missing required content blocks", () => {
    const issues = computeDraftBlockingIssues(
      draftPackage({
        sourceCitations: [],
        bodySections: [{ heading: "Empty", paragraphs: [] }]
      })
    );

    expect(issues).toEqual(
      expect.arrayContaining(["At least one source citation is required.", "Each section needs body paragraphs."])
    );
  });

  test("marks drafts as reviewed and then approved when content passes checks", () => {
    const reviewed = updateDraftReviewStatus(
      [{ ...approvedDraft(), status: "drafted" }],
      ["draft-1"],
      "mark-reviewed",
      updatedAt
    );

    expect(reviewed[0].status).toBe("reviewed");

    const approved = updateDraftReviewStatus(reviewed, ["draft-1"], "approve", updatedAt);
    expect(approved[0].status).toBe("approved");
  });

  test("marks drafts as failed_review when approval is attempted with blocking issues", () => {
    const nextQueue = updateDraftReviewStatus(
      [
        {
          ...approvedDraft({
            status: "reviewed",
            draft: draftPackage({ sourceCitations: [] })
          })
        }
      ],
      ["draft-1"],
      "approve",
      updatedAt
    );

    expect(nextQueue[0].status).toBe("failed_review");
    expect(nextQueue[0].reviewNotes).toContain("At least one source citation is required.");
  });

  test("creates published dispatches only from approved selected drafts and makes unique slugs", () => {
    const existing: PublishedDispatch[] = [
      {
        id: "dispatch-1",
        topicId: "older-topic",
        slug: "openai-launches-a-new-coding-workflow",
        title: "Older launch story",
        seoTitle: "Older launch story",
        metaDescription: "Old description",
        summary: "Old summary",
        source: "Newsletter",
        sourceUrl: "https://example.com/old",
        suggestedAngle: "Old angle",
        publishedAt: fetchedAt,
        updatedAt: fetchedAt,
        bodySections: draftPackage().bodySections,
        faq: draftPackage().faq,
        internalLinks: draftPackage().internalLinks,
        sourceCitations: draftPackage().sourceCitations
      }
    ];

    const drafts = [
      { ...approvedDraft(), selected: true },
      { ...approvedDraft({ id: "draft-2", topicId: "topic-2", selected: false }) }
    ];

    const { published, remainingDrafts } = createPublishedDispatches(drafts, existing, ["draft-1"], updatedAt);

    expect(published).toHaveLength(2);
    expect(published[1].slug).toBe("openai-launches-a-new-coding-workflow-2");
    expect(remainingDrafts[0].status).toBe("published");
    expect(remainingDrafts[1].status).toBe("approved");
  });

  test("builds workflow overview counts and surfaces waiting actions", () => {
    const overview = buildWorkflowOverview({
      candidates: [topicCandidate()],
      topicQueue: [
        {
          ...topicCandidate(),
          status: "shortlisted",
          createdAt: fetchedAt,
          updatedAt: fetchedAt
        }
      ],
      draftQueue: [
        { ...approvedDraft({ status: "drafted" }) },
        { ...approvedDraft({ id: "draft-2", topicId: "topic-2", status: "approved" }) }
      ],
      publishLog: []
    });

    expect(overview.counts.fetched).toBe(1);
    expect(overview.counts.shortlisted).toBe(1);
    expect(overview.counts.drafted).toBe(1);
    expect(overview.counts.approved).toBe(1);
    expect(overview.pendingPublish).toBe(1);
  });

  test("creates safe default automation settings", () => {
    const automation = createDefaultAutomationState();

    expect(automation.currentStatus).toBe("idle");
    expect(automation.settings.enabled).toBe(false);
    expect(automation.settings.generateLimit).toBeGreaterThan(0);
  });
});
