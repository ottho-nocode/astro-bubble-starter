export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getPosts, getContentConfig } from "../../../lib/bubble";

export const GET: APIRoute = async ({ request }) => {
  const token = getSessionFromRequest(request);
  const valid = await verifySession(token);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { mapping } = await getContentConfig();
    const articles = await getPosts();

    return new Response(
      JSON.stringify({
        articles,
        publishedField: "Os-article_status",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erreur lors du chargement des articles" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
