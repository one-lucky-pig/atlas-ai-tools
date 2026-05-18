import { describe, expect, test } from "vitest";

import { createContentServiceClient } from "../scripts/lib/content-service";

describe("content service client", () => {
  test("throws a clear error when the external content service is not configured", async () => {
    const client = createContentServiceClient({
      CONTENT_SERVICE_URL: "",
      CONTENT_SERVICE_TOKEN: "",
      CONTENT_SERVICE_TIMEOUT_MS: ""
    });

    await expect(client.fetchTopics({ limit: 5 })).rejects.toThrowError(/content service is not configured/i);
  });
});
