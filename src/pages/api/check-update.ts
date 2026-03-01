export const prerender = false;

import type { APIRoute } from "astro";
import { bubbleFetch } from "../../lib/bubble";

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get("slug");
    let raw: Record<string, any> | undefined;

    if (slug) {
      const results = await bubbleFetch<Record<string, any>>("company-vitrine", {
        constraints: [{ key: "Slug", constraint_type: "equals", value: slug }],
        limit: 1,
      });
      raw = results[0];
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
