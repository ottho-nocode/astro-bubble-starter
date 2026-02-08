export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";
import { getSiteConfig } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request }) => {
  const token = getSessionFromRequest(request);
  if (!(await verifySession(token))) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const config = await getSiteConfig();
    const apiUrl = config?.bubbleApiUrl;
    const apiToken = config?.bubbleApiToken;

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ error: "URL API Bubble non configurée. Renseignez-la dans la page Configuration." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Bubble Data API meta endpoint: GET /api/1.1/meta
    const metaUrl = `${apiUrl}/meta`;
    const headers: Record<string, string> = {};
    if (apiToken) {
      headers["Authorization"] = `Bearer ${apiToken}`;
    }

    const res = await fetch(metaUrl, { headers });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `Erreur Bubble API (${res.status}): ${text}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const meta = await res.json();

    // Bubble meta retourne { get: { ... types }, post: { ... types } }
    // On extrait la liste des types avec leurs champs
    const types: Array<{
      name: string;
      fields: Array<{ name: string; type: string }>;
    }> = [];

    const getTypes = meta?.get || {};
    for (const [typeName, typeDef] of Object.entries(getTypes)) {
      const fields: Array<{ name: string; type: string }> = [];
      const props = (typeDef as any)?.properties || {};

      for (const [fieldName, fieldDef] of Object.entries(props)) {
        fields.push({
          name: fieldName,
          type: (fieldDef as any)?.type || "unknown",
        });
      }

      // Ajouter les champs système Bubble
      fields.push(
        { name: "_id", type: "text" },
        { name: "Created_Date", type: "date" },
        { name: "Modified_Date", type: "date" },
        { name: "Created_By", type: "text" },
        { name: "Slug", type: "text" },
      );

      types.push({ name: typeName, fields });
    }

    return new Response(JSON.stringify({ types }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${(err as Error).message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
