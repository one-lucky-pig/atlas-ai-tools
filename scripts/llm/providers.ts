import type { CategorySeed, ToolEnrichment, ToolSeed } from "../../src/lib/factory/types";
import { parseJsonFromText } from "../lib/json";
import { buildToolEnrichmentPrompt } from "../lib/prompts";

type ProviderName = "openai" | "glm" | "siliconflow";

interface LLMProvider {
  name: ProviderName;
  enrichTool(tool: ToolSeed, category: CategorySeed): Promise<ToolEnrichment>;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function parseOpenAIResponsesPayload(response: Response): Promise<unknown> {
  const payload = await response.json();

  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return parseJsonFromText(payload.output_text);
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const textParts = output.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: Array<{ text?: string; type?: string }> }).content
      : [];
    return content
      .map((entry) => (typeof entry.text === "string" ? entry.text : ""))
      .filter((entry) => entry.length > 0);
  });

  if (textParts.length === 0) {
    throw new Error("OpenAI responses payload did not include text output.");
  }

  return parseJsonFromText(textParts.join("\n"));
}

async function parseChatCompletionPayload(response: Response): Promise<unknown> {
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Chat completion payload did not include message content.");
  }

  return parseJsonFromText(content);
}

function createOpenAIProvider(): LLMProvider {
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-5-mini";

  return {
    name: "openai",
    async enrichTool(tool, category) {
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          input: buildToolEnrichmentPrompt(tool, category)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI enrichment failed with status ${response.status}`);
      }

      return (await parseOpenAIResponsesPayload(response)) as ToolEnrichment;
    }
  };
}

function createChatCompletionProvider(options: {
  name: ProviderName;
  apiKeyEnv: string;
  baseUrlEnv: string;
  defaultBaseUrl: string;
  defaultModel: string;
}): LLMProvider {
  const apiKey = getRequiredEnv(options.apiKeyEnv);
  const baseUrl = process.env[options.baseUrlEnv] ?? options.defaultBaseUrl;
  const model = process.env.LLM_MODEL ?? options.defaultModel;

  return {
    name: options.name,
    async enrichTool(tool, category) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are an AI tools editorial researcher. Return JSON only."
            },
            {
              role: "user",
              content: buildToolEnrichmentPrompt(tool, category)
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`${options.name} enrichment failed with status ${response.status}`);
      }

      return (await parseChatCompletionPayload(response)) as ToolEnrichment;
    }
  };
}

export function createProvider(providerName: string | undefined): LLMProvider | null {
  if (!providerName) {
    return null;
  }

  switch (providerName) {
    case "openai":
      return createOpenAIProvider();
    case "glm":
      return createChatCompletionProvider({
        name: "glm",
        apiKeyEnv: "GLM_API_KEY",
        baseUrlEnv: "GLM_BASE_URL",
        defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        defaultModel: "glm-4.5-air"
      });
    case "siliconflow":
      return createChatCompletionProvider({
        name: "siliconflow",
        apiKeyEnv: "SILICONFLOW_API_KEY",
        baseUrlEnv: "SILICONFLOW_BASE_URL",
        defaultBaseUrl: "https://api.siliconflow.cn/v1",
        defaultModel: "Qwen/Qwen2.5-72B-Instruct"
      });
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}
