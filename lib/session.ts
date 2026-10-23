// Sesión del administrador: cookie firmada con HMAC-SHA256.
// Solo usa Web Crypto, así funciona tanto en el proxy como en el servidor.

export const SESSION_COOKIE = "dudu_admin";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken() {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${expires}.${await sign(`admin.${expires}`)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  try {
    return safeEqual(signature, await sign(`admin.${expires}`));
  } catch {
    return false;
  }
}
