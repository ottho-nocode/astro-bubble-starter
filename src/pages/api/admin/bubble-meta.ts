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

    // Bubble expose un Swagger à /api/1.1/meta/swagger.json
    // apiUrl est typiquement "https://app.bubbleapps.io/api/1.1"
    const metaUrl = `${apiUrl}/meta/swagger.json`;
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

    const swagger = await res.json();

    // Le Swagger contient :
    // - paths: /obj/{typeName}, /obj/{typeName}/{UniqueID}, etc.
    // - definitions: { typeName: { type: "object", properties: { field: { type: "string" } } } }
    // On extrait les types depuis "definitions" (exclut les types internes Swagger)
    const types: Array<{
      name: string;
      fields: Array<{ name: string; type: string }>;
    }> = [];

    const definitions = swagger?.definitions || {};
    // Types internes Swagger à ignorer
    const skipDefs = new Set(["error", "Error", "error_response", "ErrorResponse"]);

    for (const [defName, defSchema] of Object.entries(definitions)) {
      if (skipDefs.has(defName)) continue;
      const schema = defSchema as any;
      if (schema.type !== "object" || !schema.properties) continue;

      const fields: Array<{ name: string; type: string }> = [];

      for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
        const fd = fieldDef as any;
        let fieldType = fd.type || "unknown";

        // Bubble types spéciaux
        if (fieldType === "option set") {
          fieldType = "option_set";
        } else if (fd.$ref) {
          // Référence à un autre type (ex: GeographicAddress)
          const refName = fd.$ref.replace("#/definitions/", "");
          fieldType = refName === "GeographicAddress" ? "address" : "ref";
        } else if (fd.format === "date-time" || fd.format === "date") {
          fieldType = "date";
        } else if (fieldType === "boolean") {
          fieldType = "boolean";
        } else if (fieldType === "number" || fieldType === "integer") {
          fieldType = "number";
        } else if (fieldType === "array") {
          const itemType = fd.items?.type || "";
          if (itemType === "option set") fieldType = "list_option_set";
          else fieldType = "list";
        } else if (fieldType === "string") {
          fieldType = "text";
        }

        // Bubble stocke les images comme "string" (URLs S3/imgix)
        // Détection par nom du champ (FR + EN)
        if (fieldType === "text") {
          const nameLower = fieldName.toLowerCase();
          const imageKeywords = [
            "image", "photo", "picture", "avatar", "cover", "couv",
            "thumbnail", "logo", "vignette", "banner", "banniere",
            "bannière", "panorama", "illustration", "img", "pic",
          ];
          if (imageKeywords.some((kw) => nameLower.includes(kw))) {
            fieldType = "image";
          }
        }

        fields.push({ name: fieldName, type: fieldType });
      }

      // Ajouter les champs système Bubble s'ils ne sont pas déjà présents
      const existingNames = new Set(fields.map((f) => f.name));
      const systemFields = [
        { name: "_id", type: "text" },
        { name: "Created_Date", type: "date" },
        { name: "Modified_Date", type: "date" },
        { name: "Created_By", type: "text" },
        { name: "Slug", type: "text" },
      ];
      for (const sf of systemFields) {
        if (!existingNames.has(sf.name)) fields.push(sf);
      }

      types.push({ name: defName, fields });
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
