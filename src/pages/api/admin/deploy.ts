export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { updateSiteConfig } from "../../../lib/supabase";

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
    const { config } = body;

    // 1. Sauvegarder la config en Supabase
    if (config) {
      const result = await updateSiteConfig(config);
      if (!result.success) {
        return new Response(
          JSON.stringify({ error: `Erreur sauvegarde: ${result.error}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Déclencher le rebuild Vercel via Deploy Hook
    const deployHookUrl =
      (typeof process !== "undefined" && process.env?.VERCEL_DEPLOY_HOOK_URL) ||
      import.meta.env.VERCEL_DEPLOY_HOOK_URL;

    if (!deployHookUrl) {
      return new Response(
        JSON.stringify({
          success: true,
          deployed: false,
          message: "Config sauvegardée. Deploy hook non configuré.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const deployRes = await fetch(deployHookUrl, { method: "POST" });

    if (!deployRes.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          deployed: false,
          message: `Config sauvegardée. Erreur deploy: ${deployRes.status}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deployed: true,
        message: "Config sauvegardée et rebuild déclenché !",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Requête invalide" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
