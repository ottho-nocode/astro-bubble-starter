export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getSiteConfig, updateSiteConfig } from "../../../lib/supabase";

async function requireAuth(request: Request): Promise<Response | null> {
  const token = getSessionFromRequest(request);
  const valid = await verifySession(token);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const GET: APIRoute = async ({ request }) => {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const config = await getSiteConfig();

  return new Response(JSON.stringify({ config }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return new Response(
        JSON.stringify({ error: "Config manquante" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await updateSiteConfig(config);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Requête invalide" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
