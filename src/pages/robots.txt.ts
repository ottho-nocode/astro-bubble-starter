import type { APIRoute } from "astro";
import { loadSiteConfig } from "../config";

export const GET: APIRoute = async () => {
  const config = await loadSiteConfig();
  const body = `User-agent: *
Allow: /

Sitemap: ${config.url}/sitemap-index.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
};
