# AdSense Review Checklist

Use this before you submit the site for `AdSense`.

- Replace `example.com` values in `data/site.json` and `.env`
- Replace the placeholder email on `/contact`
- Replace the placeholder legal wording on `/privacy-policy` and `/terms`
- Confirm `/about`, `/contact`, `/privacy-policy`, and `/terms` all render in production
- Confirm `robots.txt` loads and `sitemap-index.xml` exists
- Confirm every published article page has:
  - non-empty title
  - non-empty meta description
  - at least one internal link block
  - no placeholder text
  - no broken official-site links
- Confirm ad placeholders are still placeholders until approval; do not overload the layout with multiple ad blocks on thin pages
- Confirm category pages, tool pages, and guide pages all have unique titles and enough body text to feel like real editorial pages
- Run:
  - `npm test`
  - `npm run generate`
  - `npm run validate`
  - `npm run build`

After approval:

- Replace `AdSlot` placeholders with real ad code in the approved positions
- Add analytics only after you have a clear privacy disclosure
