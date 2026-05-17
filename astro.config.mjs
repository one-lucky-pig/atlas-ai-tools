import "dotenv/config";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import siteConfig from "./data/site.json";

export default defineConfig({
  site: process.env.SITE_URL ?? siteConfig.url,
  integrations: [sitemap()],
  output: "static",
  trailingSlash: "never"
});
