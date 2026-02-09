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

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks, pas de texte avant/après) contenant :
- "texts": { "clé": "nouvelle valeur" } — pour les textes à modifier
- "hrefs": { "clé": "nouvelle URL" } — pour les liens à modifier
- "images": { "clé": "nouvelle URL d'image" } — pour les images à changer
- "hiddenSections": ["id"] — sections à MASQUER
- "visibleSections": ["id"] — sections à RENDRE VISIBLES

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
