import type { DraftPackage, TopicCandidate } from "../../src/lib/workflow";

export interface ContentServiceEnv {
  CONTENT_SERVICE_URL?: string;
  CONTENT_SERVICE_TOKEN?: string;
  CONTENT_SERVICE_TIMEOUT_MS?: string;
}

export interface FetchTopicsRequest {
  limit: number;
  minHeatScore?: number;
  minRelevanceScore?: number;
}

export interface GenerateDraftsRequest {
  topics: TopicCandidate[];
}

export interface ContentServiceClient {
  fetchTopics(input: FetchTopicsRequest): Promise<TopicCandidate[]>;
  generateDrafts(input: GenerateDraftsRequest): Promise<DraftPackage[]>;
}

function ensureConfigured(baseUrl: string): void {
  if (!baseUrl) {
    throw new Error("Content service is not configured.");
  }
}

async function postJson<TResponse>(
  baseUrl: string,
  token: string,
  path: string,
  payload: unknown,
  timeoutMs: number
): Promise<TResponse> {
  ensureConfigured(baseUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(path, `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Content service request failed (${response.status}): ${errorText || response.statusText}`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timer);
  }
}

export function createContentServiceClient(env: ContentServiceEnv = process.env): ContentServiceClient {
  const baseUrl = env.CONTENT_SERVICE_URL?.trim() ?? "";
  const token = env.CONTENT_SERVICE_TOKEN?.trim() ?? "";
  const timeoutMs = Number(env.CONTENT_SERVICE_TIMEOUT_MS?.trim() || "30000");

  return {
    async fetchTopics(input: FetchTopicsRequest): Promise<TopicCandidate[]> {
      const response = await postJson<{ topics: TopicCandidate[] }>(
        baseUrl,
        token,
        "topics/fetch",
        input,
        timeoutMs
      );
      return response.topics ?? [];
    },
    async generateDrafts(input: GenerateDraftsRequest): Promise<DraftPackage[]> {
      const response = await postJson<{ drafts: DraftPackage[] }>(
        baseUrl,
        token,
        "drafts/generate",
        input,
        timeoutMs
      );
      return response.drafts ?? [];
    }
  };
}
