const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "admin";
const SESSION_SECRET = import.meta.env.ADMIN_SESSION_SECRET || "change-me-in-production";
const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function createSession(): Promise<string> {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `admin:${expires}`;
  const sig = await hmacSign(payload, SESSION_SECRET);
  return `${payload}:${sig}`;
}

export async function verifySession(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;

  const parts = cookie.split(":");
  if (parts.length !== 3) return false;

  const [role, expiresStr, sig] = parts;
  const payload = `${role}:${expiresStr}`;
  const expectedSig = await hmacSign(payload, SESSION_SECRET);

  if (sig !== expectedSig) return false;

  const expires = parseInt(expiresStr, 10);
  if (Date.now() > expires) return false;

  return true;
}

export function getSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getSessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}
