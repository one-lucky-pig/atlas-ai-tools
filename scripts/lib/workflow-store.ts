import { mkdir } from "node:fs/promises";
import path from "node:path";

import type {
  AutomationState,
  DraftQueueItem,
  PublishLogEntry,
  PublishedDispatch,
  TopicCandidate,
  TopicQueueItem
} from "../../src/lib/workflow";
import { createDefaultAutomationState } from "../../src/lib/workflow";
import { readJsonFile, writeJsonFile } from "./io";
import {
  automationStateFile,
  dispatchesFile,
  draftQueueFile,
  publishLogFile,
  topicCandidatesFile,
  topicQueueFile
} from "./paths";

export interface WorkflowStorePaths {
  topicCandidatesFile: string;
  topicQueueFile: string;
  draftQueueFile: string;
  publishLogFile: string;
  automationStateFile: string;
  dispatchesFile: string;
}

export interface WorkflowStoreSnapshot {
  candidates: TopicCandidate[];
  topicQueue: TopicQueueItem[];
  draftQueue: DraftQueueItem[];
  publishLog: PublishLogEntry[];
  automation: AutomationState;
  dispatches: PublishedDispatch[];
}

export function getDefaultWorkflowStorePaths(): WorkflowStorePaths {
  return {
    topicCandidatesFile,
    topicQueueFile,
    draftQueueFile,
    publishLogFile,
    automationStateFile,
    dispatchesFile
  };
}

async function readOrDefault<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return await readJsonFile<T>(filePath);
  } catch {
    return fallback;
  }
}

export async function ensureWorkflowDirectories(paths: WorkflowStorePaths): Promise<void> {
  await Promise.all(
    Object.values(paths).map((filePath) => mkdir(path.dirname(filePath), { recursive: true }))
  );
}

export async function loadWorkflowStoreSnapshot(
  paths: WorkflowStorePaths = getDefaultWorkflowStorePaths()
): Promise<WorkflowStoreSnapshot> {
  return {
    candidates: await readOrDefault(paths.topicCandidatesFile, []),
    topicQueue: await readOrDefault(paths.topicQueueFile, []),
    draftQueue: await readOrDefault(paths.draftQueueFile, []),
    publishLog: await readOrDefault(paths.publishLogFile, []),
    automation: await readOrDefault(paths.automationStateFile, createDefaultAutomationState()),
    dispatches: await readOrDefault(paths.dispatchesFile, [])
  };
}

export async function saveTopicCandidates(
  paths: WorkflowStorePaths,
  candidates: TopicCandidate[]
): Promise<void> {
  await writeJsonFile(paths.topicCandidatesFile, candidates);
}

export async function saveTopicQueue(paths: WorkflowStorePaths, queue: TopicQueueItem[]): Promise<void> {
  await writeJsonFile(paths.topicQueueFile, queue);
}

export async function saveDraftQueue(paths: WorkflowStorePaths, queue: DraftQueueItem[]): Promise<void> {
  await writeJsonFile(paths.draftQueueFile, queue);
}

export async function savePublishLog(paths: WorkflowStorePaths, log: PublishLogEntry[]): Promise<void> {
  await writeJsonFile(paths.publishLogFile, log);
}

export async function saveAutomationState(
  paths: WorkflowStorePaths,
  automation: AutomationState
): Promise<void> {
  await writeJsonFile(paths.automationStateFile, automation);
}

export async function savePublishedDispatches(
  paths: WorkflowStorePaths,
  dispatches: PublishedDispatch[]
): Promise<void> {
  await writeJsonFile(paths.dispatchesFile, dispatches);
}
