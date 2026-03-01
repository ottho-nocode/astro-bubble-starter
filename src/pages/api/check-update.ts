export const prerender = false;

import type { APIRoute } from "astro";
import { bubbleFetch, bubbleFetchAll } from "../../lib/bubble";

function trimName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get("slug");
    let raw: Record<string, any> | undefined;

    if (slug) {
      const results = await bubbleFetchAll<Record<string, any>>("company-vitrine");
      raw = results.find((r) => trimName(r["Nom"] || r["nom"] || "") === slug.toLowerCase());
    } else {
      const results = await bubbleFetch<Record<string, any>>("company-vitrine", {
        limit: 1,
      });
      raw = results[0];
    }
    return new Response(
      JSON.stringify({ modified: raw?.["Modified Date"] || "" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store",
        },
      }
    );
  } catch {
    return new Response(JSON.stringify({ modified: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
