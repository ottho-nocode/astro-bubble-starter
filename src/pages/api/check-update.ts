export const prerender = false;

import type { APIRoute } from "astro";
import { bubbleFetch } from "../../lib/bubble";

export const GET: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get("id");
    let raw: Record<string, any> | undefined;

    if (id) {
      const { bubbleFetchById } = await import("../../lib/bubble");
      raw = await bubbleFetchById("company-vitrine", id);
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
