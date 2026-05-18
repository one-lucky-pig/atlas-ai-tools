import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  AutomationSettings,
  DraftPackage,
  DraftQueueItem,
  PublishLogEntry,
  TopicCandidate,
  TopicQueueItem,
  WorkflowOverview
} from "../../src/lib/workflow";
import {
  applyGeneratedDraftPackages,
  buildWorkflowOverview,
  createDefaultAutomationState,
  createDraftQueueEntries,
  createPublishedDispatches,
  markTopicsBriefed,
  mergeTopicCandidates,
  updateDraftReviewStatus
} from "../../src/lib/workflow";
import { createContentServiceClient } from "./content-service";
import {
  getDefaultWorkflowStorePaths,
  loadWorkflowStoreSnapshot,
  saveAutomationState,
  saveDraftQueue,
  savePublishLog,
  savePublishedDispatches,
  saveTopicCandidates,
  saveTopicQueue,
  type WorkflowStorePaths
} from "./workflow-store";
import { shortlistTopicCandidates } from "../../src/lib/workflow";

const execFileAsync = promisify(execFile);

export interface WorkflowOverviewResponse {
  overview: WorkflowOverview;
  candidates: TopicCandidate[];
  topicQueue: TopicQueueItem[];
  draftQueue: DraftQueueItem[];
  publishLog: PublishLogEntry[];
  automation: ReturnType<typeof createDefaultAutomationState>;
}

function createLogEntry(status: "success" | "error", message: string, draftIds: string[]): PublishLogEntry {
  const now = new Date().toISOString();
  return {
    id: `publish-${now}`,
    draftIds,
    status,
    startedAt: now,
    finishedAt: now,
    message
  };
}

function applyDraftPatch(draft: DraftPackage | null, patch: Partial<DraftPackage>): DraftPackage | null {
  if (!draft) {
    return draft;
  }

  return {
    ...draft,
    ...patch,
    bodySections: patch.bodySections ?? draft.bodySections,
    faq: patch.faq ?? draft.faq,
    internalLinks: patch.internalLinks ?? draft.internalLinks,
    sourceCitations: patch.sourceCitations ?? draft.sourceCitations,
    outline: patch.outline ?? draft.outline,
    qualityNotes: patch.qualityNotes ?? draft.qualityNotes
  };
}

function withDraftsMarkedFailed(
  drafts: DraftQueueItem[],
  ids: string[],
  status: "failed_generate" | "failed_publish",
  reason: string
): DraftQueueItem[] {
  const selected = new Set(ids);
  const timestamp = new Date().toISOString();

  return drafts.map((draft) =>
    selected.has(draft.id)
      ? {
          ...draft,
          status,
          updatedAt: timestamp,
          reviewNotes: [...draft.reviewNotes, reason]
        }
      : draft
  );
}

async function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd: process.cwd(),
    env: process.env
  });
}

async function runPublishPipeline(): Promise<void> {
  await runCommand("npm", ["run", "generate"]);
  await runCommand("npm", ["run", "validate"]);
  await runCommand("npm", ["run", "build"]);
}

async function commitAndPushPublishedDispatches(draftIds: string[]): Promise<string> {
  const targetBranch = process.env.STUDIO_PUBLISH_TARGET_BRANCH?.trim() || "main";
  const currentBranch = (await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();

  if (currentBranch !== targetBranch) {
    throw new Error(`Publish requires branch ${targetBranch}, but current branch is ${currentBranch}.`);
  }

  await runCommand("git", ["add", "data/editorial/articles.json"]);

  const commitMessage = `Publish ${draftIds.length} dispatch${draftIds.length === 1 ? "" : "es"}`;
  await runCommand("git", ["commit", "-m", commitMessage]);
  await runCommand("git", ["push", "origin", targetBranch]);

  return (await runCommand("git", ["rev-parse", "HEAD"])).stdout.trim();
}

export async function getWorkflowOverviewData(
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  return {
    overview: buildWorkflowOverview(snapshot),
    candidates: snapshot.candidates,
    topicQueue: snapshot.topicQueue,
    draftQueue: snapshot.draftQueue,
    publishLog: snapshot.publishLog,
    automation: snapshot.automation
  };
}

export async function fetchWorkflowTopics(
  input: {
    limit: number;
    minHeatScore?: number;
    minRelevanceScore?: number;
  },
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<TopicCandidate[]> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const client = createContentServiceClient(process.env);
  const incoming = await client.fetchTopics(input);
  const merged = mergeTopicCandidates(snapshot.candidates, incoming);
  await saveTopicCandidates(paths, merged);
  return merged;
}

export async function shortlistWorkflowTopics(
  ids: string[],
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const { remainingCandidates, queue } = shortlistTopicCandidates(
    snapshot.candidates,
    snapshot.topicQueue,
    ids,
    new Date().toISOString()
  );
  await saveTopicCandidates(paths, remainingCandidates);
  await saveTopicQueue(paths, queue);
  return getWorkflowOverviewData(paths);
}

export async function generateWorkflowDrafts(
  ids: string[],
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const client = createContentServiceClient(process.env);
  const timestamp = new Date().toISOString();
  const nextTopicQueue = markTopicsBriefed(snapshot.topicQueue, ids, timestamp);
  const nextDraftQueue = createDraftQueueEntries(nextTopicQueue, snapshot.draftQueue, ids, timestamp);
  const topics = nextTopicQueue.filter((topic) => ids.includes(topic.id));

  await saveTopicQueue(paths, nextTopicQueue);
  await saveDraftQueue(paths, nextDraftQueue);

  try {
    const generatedDrafts = await client.generateDrafts({ topics });
    await saveDraftQueue(paths, applyGeneratedDraftPackages(nextDraftQueue, generatedDrafts, new Date().toISOString()));
  } catch (error) {
    await saveDraftQueue(
      paths,
      withDraftsMarkedFailed(
        nextDraftQueue,
        ids,
        "failed_generate",
        error instanceof Error ? error.message : String(error)
      )
    );
    throw error;
  }

  return getWorkflowOverviewData(paths);
}

export async function reviewWorkflowDrafts(
  input: {
    ids: string[];
    action: "mark-reviewed" | "approve" | "reopen" | "update";
    patch?: Partial<DraftPackage>;
  },
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  let nextDraftQueue = snapshot.draftQueue;

  if (input.action === "update") {
    const selected = new Set(input.ids);
    nextDraftQueue = snapshot.draftQueue.map((draft) =>
      selected.has(draft.id)
        ? {
            ...draft,
            draft: applyDraftPatch(draft.draft, input.patch ?? {}),
            updatedAt: new Date().toISOString()
          }
        : draft
    );
  } else {
    nextDraftQueue = updateDraftReviewStatus(
      snapshot.draftQueue,
      input.ids,
      input.action,
      new Date().toISOString()
    );
  }

  await saveDraftQueue(paths, nextDraftQueue);
  return getWorkflowOverviewData(paths);
}

export async function publishWorkflowDrafts(
  ids: string[],
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const timestamp = new Date().toISOString();
  const previousDispatches = snapshot.dispatches;
  const { published, remainingDrafts } = createPublishedDispatches(snapshot.draftQueue, previousDispatches, ids, timestamp);

  await savePublishedDispatches(paths, published);

  try {
    await runPublishPipeline();
    const commitHash = await commitAndPushPublishedDispatches(ids);
    await saveDraftQueue(
      paths,
      remainingDrafts.map((draft) =>
        ids.includes(draft.id) && draft.status === "published"
          ? {
              ...draft,
              publishedCommit: commitHash
            }
          : draft
      )
    );
    await savePublishLog(paths, [
      ...snapshot.publishLog,
      {
        ...createLogEntry("success", `Published ${ids.length} dispatches.`, ids),
        commitHash
      }
    ]);
  } catch (error) {
    await savePublishedDispatches(paths, previousDispatches);
    await saveDraftQueue(
      paths,
      withDraftsMarkedFailed(
        snapshot.draftQueue,
        ids,
        "failed_publish",
        error instanceof Error ? error.message : String(error)
      )
    );
    await savePublishLog(paths, [
      ...snapshot.publishLog,
      createLogEntry("error", error instanceof Error ? error.message : String(error), ids)
    ]);
    throw error;
  }

  return getWorkflowOverviewData(paths);
}

export async function saveWorkflowAutomationSettings(
  settings: Partial<AutomationSettings>,
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<ReturnType<typeof createDefaultAutomationState>> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const nextAutomation = {
    ...snapshot.automation,
    settings: {
      ...snapshot.automation.settings,
      ...settings
    }
  };

  await saveAutomationState(paths, nextAutomation);
  return nextAutomation;
}

export async function runWorkflowAutomationOnce(
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowOverviewResponse> {
  const snapshot = await loadWorkflowStoreSnapshot(paths);
  const timestamp = new Date().toISOString();
  const nextAutomation = {
    ...snapshot.automation,
    currentStatus: "running" as const,
    recentRuns: [
      {
        id: `run-${timestamp}`,
        startedAt: timestamp,
        status: "running" as const,
        fetchedCount: 0,
        shortlistedCount: 0,
        generatedCount: 0,
        message: "Automation run started."
      },
      ...snapshot.automation.recentRuns
    ].slice(0, 20)
  };

  await saveAutomationState(paths, nextAutomation);

  try {
    const fetched = await fetchWorkflowTopics(
      {
        limit: snapshot.automation.settings.fetchLimit,
        minHeatScore: snapshot.automation.settings.minHeatScore,
        minRelevanceScore: snapshot.automation.settings.minRelevanceScore
      },
      paths
    );

    const selectedIds = fetched
      .slice(0, snapshot.automation.settings.generateLimit)
      .map((candidate) => candidate.id);

    await shortlistWorkflowTopics(selectedIds, paths);
    await generateWorkflowDrafts(selectedIds, paths);

    const successState = {
      ...nextAutomation,
      currentStatus: "success" as const,
      lastRunAt: new Date().toISOString(),
      recentRuns: nextAutomation.recentRuns.map((run, index) =>
        index === 0
          ? {
              ...run,
              status: "success" as const,
              finishedAt: new Date().toISOString(),
              fetchedCount: fetched.length,
              shortlistedCount: selectedIds.length,
              generatedCount: selectedIds.length,
              message: "Automation run completed."
            }
          : run
      )
    };

    await saveAutomationState(paths, successState);
  } catch (error) {
    const errorState = {
      ...nextAutomation,
      currentStatus: "error" as const,
      lastRunAt: new Date().toISOString(),
      recentRuns: nextAutomation.recentRuns.map((run, index) =>
        index === 0
          ? {
              ...run,
              status: "error" as const,
              finishedAt: new Date().toISOString(),
              message: error instanceof Error ? error.message : String(error)
            }
          : run
      )
    };
    await saveAutomationState(paths, errorState);
    throw error;
  }

  return getWorkflowOverviewData(paths);
}
