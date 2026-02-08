import type { APIRoute } from "astro";
import { siteConfig } from "../config";

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${siteConfig.url}/sitemap-index.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
};
