export const prerender = false;

import type { APIRoute } from "astro";
import {
  verifySession,
  getSessionFromRequest,
} from "../../../lib/admin-auth";

function getEnv(key: string): string {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key]!;
  const vite = (import.meta as any).env?.[key];
  return vite || "";
}

export const POST: APIRoute = async ({ request }) => {
  const token = getSessionFromRequest(request);
  if (!(await verifySession(token))) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY)" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { prompt, schema, currentOverrides } = await request.json();

    if (!prompt || !schema) {
      return new Response(
        JSON.stringify({ error: "Prompt et schema requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build a structured description of the template
    const schemaDescription = schema
      .map((section: any) => {
        const hidden = (currentOverrides?.hiddenSections || []).includes(section.id);
        let desc = `## Section "${section.label}" (id: ${section.id}, ${hidden ? "MASQUÉE" : "visible"})\n`;
        section.texts.forEach((t: any) => {
          const current = currentOverrides?.texts?.[t.key] ?? t.text;
          desc += `  - [${t.key}] <${t.tag}>: "${current}"\n`;
          if (t.href !== undefined) {
            const href = currentOverrides?.hrefs?.[t.key] ?? t.href;
            desc += `    lien: ${href}\n`;
          }
        });
        section.images.forEach((img: any) => {
          const current = currentOverrides?.images?.[img.key] || img.src;
          desc += `  - [${img.key}] <img> alt="${img.alt}": ${current}\n`;
        });
        return desc;
      })
      .join("\n");

    const systemPrompt = `Tu es un assistant d'édition de landing page. Tu reçois la structure actuelle d'un template avec toutes ses sections, textes et images. L'utilisateur te demande de modifier le contenu.

FORMAT DE RÉPONSE OBLIGATOIRE — retourne UNIQUEMENT un objet JSON valide (pas de markdown, pas de backticks, pas d'explication) avec cette structure exacte :
{
  "texts": { "section-N-text-M": "nouvelle valeur" },
  "hrefs": { "section-N-text-M": "https://..." },
  "images": { "section-N-img-M": "https://..." },
  "hiddenSections": ["section-N"],
  "visibleSections": ["section-N"]
}
N'inclus que les clés que tu modifies. Les textes vont dans "texts", les images dans "images", les liens dans "hrefs".

Règles :
- IMPORTANT : Quand l'utilisateur demande d'adapter le site à un thème, secteur ou entreprise, modifie TOUS les textes de TOUTES les sections visibles pour les rendre cohérents avec la demande. Ne laisse aucun texte générique ou sans rapport.
- Adapte les textes au ton, contexte et secteur demandé
- Garde les textes concis et percutants (style landing page)
- Les textes doivent être en français sauf indication contraire
- Pour les images, utilise des URLs Unsplash valides si besoin (format: https://images.unsplash.com/photo-xxx?w=800&q=80)
- Si l'utilisateur demande un changement ciblé sur un élément spécifique, ne modifie que cet élément`;

    const userMessage = `Structure actuelle du template :\n\n${schemaDescription}\n\nDemande : ${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Erreur API Anthropic (${response.status})`, detail: errText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";

    let changes;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      changes = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Réponse IA invalide", raw: content }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Normaliser la réponse : si l'IA retourne un format plat (clés section-*
    // directement au lieu de les nester sous "texts"/"images"/"hrefs"), restructurer
    const keyPattern = /^section-\d+-(?:text|img)-\d+$/;
    const hasNestedFormat = changes.texts || changes.images || changes.hrefs ||
      changes.hiddenSections || changes.visibleSections;

    if (!hasNestedFormat) {
      const normalized: Record<string, any> = { texts: {}, images: {}, hrefs: {} };
      for (const [key, value] of Object.entries(changes)) {
        if (keyPattern.test(key)) {
          if (key.includes("-img-")) {
            normalized.images[key] = value;
          } else {
            normalized.texts[key] = value;
          }
        }
      }
      // Ne garder que les clés non vides
      if (Object.keys(normalized.texts).length === 0) delete normalized.texts;
      if (Object.keys(normalized.images).length === 0) delete normalized.images;
      if (Object.keys(normalized.hrefs).length === 0) delete normalized.hrefs;
      changes = normalized;
    }

    return new Response(
      JSON.stringify({ success: true, changes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
