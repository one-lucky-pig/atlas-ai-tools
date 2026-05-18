import type { APIRoute } from "astro";
import { site } from "../lib/site-data";

export const GET: APIRoute = () => {
  const publisherId = site.adsensePublisherId?.trim();
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# AdSense publisher ID not configured.\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
};
