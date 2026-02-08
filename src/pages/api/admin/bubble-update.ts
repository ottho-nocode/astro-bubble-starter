export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getSiteConfig } from "../../../lib/supabase";
import { bubblePatch } from "../../../lib/bubble";

export const POST: APIRoute = async ({ request }) => {
  const token = getSessionFromRequest(request);
  const valid = await verifySession(token);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { id, field, value } = body;

    if (!id || !field) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants (id, field)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = await getSiteConfig();
    const tableName = config?.bubbleContentTable;

    if (!tableName) {
      return new Response(
        JSON.stringify({ error: "Table Bubble non configurée" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await bubblePatch(tableName, id, { [field]: value });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erreur lors de la mise à jour Bubble" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
