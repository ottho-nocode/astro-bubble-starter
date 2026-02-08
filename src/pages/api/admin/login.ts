export const prerender = false;

import type { APIRoute } from "astro";
import {
  checkPassword,
  createSession,
  getSessionCookie,
} from "../../../lib/admin-auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || !checkPassword(password)) {
      return new Response(JSON.stringify({ error: "Mot de passe incorrect" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = await createSession();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": getSessionCookie(token),
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Requête invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
