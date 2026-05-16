import "dotenv/config";

import http from "node:http";
import { spawn } from "node:child_process";

import { getStudioJobDefinition, listStudioJobs, type StudioJobId } from "./lib/studio-jobs";
import { enrichToolForStudio } from "./lib/studio-enrichment";
import type { CategorySeed, ToolSeed } from "../src/lib/factory/types";

const port = Number(process.env.STUDIO_BRIDGE_PORT ?? "4323");
const projectRoot = process.cwd();
let busy = false;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

function writeJson(
  response: http.ServerResponse,
  statusCode: number,
  payload: unknown,
  origin?: string
): void {
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      data += chunk;
    });
    request.on("end", () => resolve(data));
    request.on("error", reject);
  });
}

async function runJob(jobId: StudioJobId): Promise<{
  job: string;
  label: string;
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
}> {
  const definition = getStudioJobDefinition(jobId);
  const [command, ...args] = definition.command;
  const startedAt = new Date().toISOString();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      shell: process.platform === "win32"
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      resolve({
        job: definition.id,
        label: definition.label,
        success: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date().toISOString()
      });
    });
  });
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;

  if (request.method === "OPTIONS") {
    if (origin && isAllowedOrigin(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "content-type");
      response.setHeader("Vary", "Origin");
    }
    response.writeHead(204);
    response.end();
    return;
  }

  if (!isAllowedOrigin(origin)) {
    writeJson(response, 403, { error: "Origin not allowed." }, origin);
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    writeJson(
      response,
      200,
      {
        ok: true,
        busy,
        jobs: listStudioJobs(),
        projectRoot
      },
      origin
    );
    return;
  }

  if (request.method === "POST" && request.url === "/run") {
    if (busy) {
      writeJson(response, 409, { error: "A studio job is already running." }, origin);
      return;
    }

    try {
      const raw = await readRequestBody(request);
      const payload = JSON.parse(raw || "{}") as { job?: StudioJobId };
      if (!payload.job) {
        writeJson(response, 400, { error: "Missing job id." }, origin);
        return;
      }

      busy = true;
      const result = await runJob(payload.job);
      busy = false;
      writeJson(response, 200, result, origin);
    } catch (error) {
      busy = false;
      writeJson(
        response,
        500,
        {
          error: error instanceof Error ? error.message : String(error)
        },
        origin
      );
    }
    return;
  }

  if (request.method === "POST" && request.url === "/enrich-tool") {
    if (busy) {
      writeJson(response, 409, { error: "A studio operation is already running." }, origin);
      return;
    }

    try {
      const raw = await readRequestBody(request);
      const payload = JSON.parse(raw || "{}") as {
        tool?: ToolSeed;
        categories?: CategorySeed[];
        force?: boolean;
      };

      if (!payload.tool || !payload.categories) {
        writeJson(response, 400, { error: "Missing tool or categories." }, origin);
        return;
      }

      busy = true;
      const result = await enrichToolForStudio({
        tool: payload.tool,
        categories: payload.categories,
        force: payload.force
      });
      busy = false;

      writeJson(
        response,
        200,
        {
          success: true,
          ...result
        },
        origin
      );
    } catch (error) {
      busy = false;
      writeJson(
        response,
        500,
        {
          error: error instanceof Error ? error.message : String(error)
        },
        origin
      );
    }
    return;
  }

  writeJson(response, 404, { error: "Not found." }, origin);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Studio bridge listening on http://127.0.0.1:${port}`);
});
