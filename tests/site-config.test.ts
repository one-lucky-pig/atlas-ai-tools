import { describe, expect, test } from "vitest";

import { resolveSiteConfig } from "../src/lib/factory/site-config";
import type { SiteConfig } from "../src/lib/factory/types";

const baseConfig: SiteConfig = {
  name: "Atlas AI Tools",
  domain: "example.com",
  url: "https://example.com",
  description: "Editorial AI tools directory."
};

describe("resolveSiteConfig", () => {
  test("keeps base fields and derives safe contact defaults when no environment overrides are supplied", () => {
    const result = resolveSiteConfig(baseConfig, {});

    expect(result.name).toBe(baseConfig.name);
    expect(result.domain).toBe(baseConfig.domain);
    expect(result.url).toBe(baseConfig.url);
    expect(result.contactEmail).toBe("contact@example.com");
    expect(result.legalEntity).toBe("Atlas AI Tools");
  });

  test("overrides name, domain, and url from environment variables", () => {
    const result = resolveSiteConfig(baseConfig, {
      SITE_NAME: "Factory Atlas",
      SITE_DOMAIN: "aitools.example.org",
      SITE_URL: "https://aitools.example.org"
    });

    expect(result.name).toBe("Factory Atlas");
    expect(result.domain).toBe("aitools.example.org");
    expect(result.url).toBe("https://aitools.example.org");
  });

  test("supports contact email and legal entity overrides", () => {
    const result = resolveSiteConfig(baseConfig, {
      SITE_CONTACT_EMAIL: "ops@aitools.example.org",
      SITE_LEGAL_ENTITY: "Atlas Media Lab"
    });

    expect(result.contactEmail).toBe("ops@aitools.example.org");
    expect(result.legalEntity).toBe("Atlas Media Lab");
  });
});
