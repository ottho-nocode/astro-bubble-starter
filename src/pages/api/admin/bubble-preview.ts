export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getSiteConfig } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
  const token = getSessionFromRequest(request);
  if (!(await verifySession(token))) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { tableName, limit = 5 } = body;

    if (!tableName) {
      return new Response(
        JSON.stringify({ error: "tableName requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = await getSiteConfig();
    const apiUrl = config?.bubbleApiUrl;
    const apiToken = config?.bubbleApiToken;

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ error: "URL API Bubble non configurée" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fetchUrl = `${apiUrl}/obj/${tableName}?limit=${limit}`;
    const headers: Record<string, string> = {};
    if (apiToken) {
      headers["Authorization"] = `Bearer ${apiToken}`;
    }

    const res = await fetch(fetchUrl, { headers });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `Erreur Bubble API (${res.status}): ${text}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const results = data?.response?.results || [];

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${(err as Error).message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
