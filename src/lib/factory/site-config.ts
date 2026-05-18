import type { SiteConfig } from "./types";

export function resolveSiteConfig(
  baseConfig: SiteConfig,
  env: Partial<
    Record<
      | "SITE_NAME"
      | "SITE_DOMAIN"
      | "SITE_URL"
      | "SITE_CONTACT_EMAIL"
      | "SITE_LEGAL_ENTITY"
      | "SITE_GOOGLE_SITE_VERIFICATION"
      | "SITE_ADSENSE_PUBLISHER_ID",
      string | undefined
    >
  >
): SiteConfig {
  const domain = env.SITE_DOMAIN?.trim() || baseConfig.domain;
  return {
    ...baseConfig,
    name: env.SITE_NAME?.trim() || baseConfig.name,
    domain,
    url: env.SITE_URL?.trim() || baseConfig.url,
    contactEmail:
      env.SITE_CONTACT_EMAIL?.trim() ||
      baseConfig.contactEmail ||
      `contact@${domain.replace(/^https?:\/\//, "")}`,
    legalEntity: env.SITE_LEGAL_ENTITY?.trim() || baseConfig.legalEntity || baseConfig.name,
    googleSiteVerification:
      env.SITE_GOOGLE_SITE_VERIFICATION?.trim() || baseConfig.googleSiteVerification || undefined,
    adsensePublisherId:
      env.SITE_ADSENSE_PUBLISHER_ID?.trim() || baseConfig.adsensePublisherId || undefined
  };
}
