export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getCompanyInfo, bubblePatch, clearCompanyInfoCache } from "../../../lib/bubble";
import {
  setLandingConfigFromCompany,
  getLandingConfig,
  configToBubbleFields,
} from "../../../lib/landing-config";
import type { LandingConfig } from "../../../lib/landing-config";

async function authGuard(request: Request): Promise<Response | null> {
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
  const denied = await authGuard(request);
  if (denied) return denied;

  try {
    clearCompanyInfoCache(); // Always fetch fresh data in admin
    const company = await getCompanyInfo();
    if (company) {
      setLandingConfigFromCompany(company);
    }
    const config = getLandingConfig();
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ config: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const denied = await authGuard(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const config = body.config as LandingConfig;

    // Extract only the 14 Bubble-backed fields
    const bubbleFields = configToBubbleFields(config);

    // Get the company record ID
    const company = await getCompanyInfo();
    if (!company?._id) {
      return new Response(
        JSON.stringify({ error: "Aucun enregistrement company-vitrine trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // PATCH the Bubble record
    await bubblePatch("company-vitrine", company._id, bubbleFields);
    clearCompanyInfoCache(); // Invalidate cache after save

    return new Response(
      JSON.stringify({
        success: true,
        message: "Configuration sauvegardee dans Bubble.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Erreur: ${err instanceof Error ? err.message : "Requete invalide"}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
