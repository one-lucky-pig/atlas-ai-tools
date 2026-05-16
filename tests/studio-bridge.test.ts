import { describe, expect, test } from "vitest";

import { getStudioJobDefinition, listStudioJobs } from "../scripts/lib/studio-jobs";

describe("studio bridge job definitions", () => {
  test("lists supported local studio jobs", () => {
    const jobs = listStudioJobs();

    expect(jobs.map((job) => job.id)).toEqual([
      "generate",
      "validate",
      "build",
      "scheduler-once"
    ]);
  });

  test("resolves a known job to a safe npm command", () => {
    const job = getStudioJobDefinition("build");

    expect(job.label).toBe("构建静态站点");
    expect(job.command).toEqual(["npm", "run", "build"]);
  });

  test("throws for an unknown job", () => {
    expect(() => getStudioJobDefinition("rm -rf" as never)).toThrowError(/unknown studio job/i);
  });
});
