import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import { createDefaultAutomationState, type DraftQueueItem, type TopicCandidate } from "../src/lib/workflow";
import {
  loadWorkflowStoreSnapshot,
  saveDraftQueue,
  savePublishedDispatches,
  saveTopicCandidates,
  type WorkflowStorePaths
} from "../scripts/lib/workflow-store";

const tempDirs: string[] = [];

async function createPaths(): Promise<WorkflowStorePaths> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "studio-workflow-"));
  tempDirs.push(dir);

  return {
    topicCandidatesFile: path.join(dir, "runtime", "topic-candidates.json"),
    topicQueueFile: path.join(dir, "runtime", "topic-queue.json"),
    draftQueueFile: path.join(dir, "runtime", "draft-queue.json"),
    publishLogFile: path.join(dir, "runtime", "publish-log.json"),
    automationStateFile: path.join(dir, "runtime", "automation-state.json"),
    dispatchesFile: path.join(dir, "data", "editorial", "articles.json")
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("workflow store", () => {
  test("loads safe defaults when workflow files do not exist yet", async () => {
    const paths = await createPaths();

    const snapshot = await loadWorkflowStoreSnapshot(paths);

    expect(snapshot.candidates).toEqual([]);
    expect(snapshot.topicQueue).toEqual([]);
    expect(snapshot.draftQueue).toEqual([]);
    expect(snapshot.publishLog).toEqual([]);
    expect(snapshot.dispatches).toEqual([]);
    expect(snapshot.automation).toEqual(createDefaultAutomationState());
  });

  test("persists candidates, drafts, and published dispatches to JSON files", async () => {
    const paths = await createPaths();

    const candidates: TopicCandidate[] = [
      {
        id: "topic-1",
        title: "A launch",
        summary: "Summary",
        source: "HN",
        sourceUrl: "https://example.com/topic-1",
        fetchedAt: "2026-05-18T00:00:00.000Z",
        heatScore: 75,
        relevanceScore: 82,
        riskFlags: [],
        suggestedAngle: "Angle"
      }
    ];

    const drafts: DraftQueueItem[] = [
      {
        ...candidates[0],
        topicId: "topic-1",
        status: "approved",
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T01:00:00.000Z",
        selected: false,
        reviewNotes: [],
        draft: {
          topicId: "topic-1",
          workingTitle: "A launch",
          seoTitle: "A launch for teams",
          metaDescription: "Meta",
          outline: ["One"],
          bodySections: [{ heading: "One", paragraphs: ["Body"] }],
          faq: [],
          internalLinks: [{ label: "Home", href: "/" }],
          sourceCitations: [{ label: "Source", url: "https://example.com/topic-1" }],
          qualityNotes: []
        }
      }
    ];

    await saveTopicCandidates(paths, candidates);
    await saveDraftQueue(paths, drafts);
    await savePublishedDispatches(paths, []);

    const storedCandidates = JSON.parse(await readFile(paths.topicCandidatesFile, "utf-8"));
    const storedDrafts = JSON.parse(await readFile(paths.draftQueueFile, "utf-8"));

    expect(storedCandidates[0].id).toBe("topic-1");
    expect(storedDrafts[0].status).toBe("approved");
  });
});
