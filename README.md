# Atlas AI Tools

An Astro-based static site factory for an English-first AI tools directory. The project generates category, tool, comparison, and guide pages from structured seed data, then validates them through publishing quality gates before build output.

## What is included

- `Astro` static site with editorial-style templates
- Seeded category and tool catalog under `data/seeds/`
- Shared factory logic for:
  - catalog validation
  - LLM output normalization
  - page quality gates
  - publishing slowdown / pause decisions
- Multi-provider enrichment adapter skeletons for:
  - `GLM`
  - `OpenAI responses-style`
  - `SiliconFlow`
- Local scheduler for recurring pipeline runs
- Base legal / contact pages for `AdSense` readiness

## Commands

- `npm install`
- `npm run generate`
  Builds `data/generated/site-bundle.json` and `data/generated/pipeline-report.json`
- `npm run validate`
  Re-checks the generated bundle against publishing quality gates
- `npm run dev`
  Generates the bundle, then starts Astro dev server
- `npm run build`
  Generates the bundle and builds a static site into `dist/`
- `npm run scheduler -- --once`
  Runs a single scheduled pipeline pass and writes `runtime/scheduler-state.json`
- `npm run scheduler`
  Runs the local recurring scheduler using `SCHEDULER_INTERVAL_MINUTES`

## Local studio

Visit `/studio` in local dev or preview mode for the Chinese management page.

- It edits browser-local draft state
- It does not write files directly to disk
- Use it to export updated `site.json`, `categories.json`, `tools.json`, and `enrichments.json`
- After exporting, replace the matching files in `data/` and rebuild
- On supported Chromium-class browsers, you can also bind `site.json`, `categories.json`, and `tools.json` for direct local save
- To trigger `generate` / `validate` / `build` from the page itself, start the bridge in another terminal with `npm run studio:bridge`
- The same bridge also powers “AI 补全当前工具” for per-tool enrichment previews and `enrichments.json` maintenance

## Environment

Copy `.env.example` to `.env` and fill in what you need.

- `SITE_URL`
- `SITE_NAME`
- `SITE_DOMAIN`
- `SITE_CONTACT_EMAIL`
- `SITE_LEGAL_ENTITY`
- `LLM_PROVIDER`
  - `openai`
  - `glm`
  - `siliconflow`
- `LLM_MODEL`
- Provider credentials:
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `GLM_API_KEY`
  - `GLM_BASE_URL`
  - `SILICONFLOW_API_KEY`
  - `SILICONFLOW_BASE_URL`

If no provider is configured, the pipeline falls back to deterministic enrichment so the site still builds.
If a provider is configured, generated enrichments are cached in `data/generated/enrichments.json` so repeat runs do not waste requests on already-enriched tools.

## Data flow

1. Edit `data/seeds/categories.json`
2. Edit `data/seeds/tools.json`
3. Run `npm run generate`
4. Inspect `data/generated/pipeline-report.json`
5. Run `npm run build`
6. Deploy `dist/` or connect the repo to `Vercel`

## Publishing observations

The scheduler optionally reads `runtime/category-observations.json` if you create it from `config/category-observations.example.json`.

This file is where you can paste category-level observations from `Google Search Console` and your own spot checks so the strategy layer can recommend:

- `keep_publishing`
- `slow_down`
- `pause_template`
- `refresh_titles_and_links`

## Manual tasks you still own

- Point your real domain and set `SITE_URL`
- Verify the property in `Google Search Console`
- Submit sitemap and request indexing
- Replace placeholder legal/contact copy
- Apply for `AdSense`
- Replace placeholder contact details and policy language with real business info
