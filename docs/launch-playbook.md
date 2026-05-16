# Launch Playbook

## 1. Update site identity

- Edit `data/site.json`
- Edit `.env`
- Confirm `SITE_CONTACT_EMAIL` and `SITE_LEGAL_ENTITY`

## 2. Validate the content bundle

- Optional: use `/studio` locally to edit site settings, categories, and tools, then export JSON back into `data/`
- Optional: run `npm run studio:bridge` to let `/studio` trigger local generate/validate/build jobs
- Add or edit categories in `data/seeds/categories.json`
- Add or edit tools in `data/seeds/tools.json`
- Run `npm run generate`
- Review `data/generated/pipeline-report.json`

## 3. Enable AI enrichment

- Set `LLM_PROVIDER`
- Add the matching provider credentials
- Optional: use `/studio` + `npm run studio:bridge` to generate and inspect tool-level enrichment before a full site build
- Re-run `npm run generate`

## 4. Build and preview

- Run `npm run build`
- Run `npm run preview -- --host 127.0.0.1 --port 4321`

## 5. Deploy

- Push to GitHub
- Connect to `Vercel`
- Set production environment variables in `Vercel`
- Redeploy

## 6. Search setup

- Verify the domain in `Google Search Console`
- Submit `sitemap-index.xml`
- Request indexing for the homepage, one category page, and a small sample of tool/guide pages

## 7. Post-launch observation loop

- Copy `config/category-observations.example.json` to `runtime/category-observations.json`
- Fill in indexed pages, published pages, and pages with impressions by category
- Run `npm run scheduler -- --once`
- Review `runtime/publishing-decisions.json`
