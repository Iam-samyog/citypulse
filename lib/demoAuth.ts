const SESSION_COOKIE = "citypulse_demo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const configured = process.env.DEMO_SESSION_SECRET || process.env.DEMO_PASSWORD;
  if (configured) return configured;
  // Local development without any DEMO_* variables uses the built-in default login, so it
  // needs a built-in signing key too — otherwise the session cookie is signed with an empty
  // key, comes out unsigned, and the middleware rejects it right after a successful login.
  // Production never gets this fallback: it must set DEMO_SESSION_SECRET.
  return process.env.NODE_ENV === "production" ? "" : "oracle-of-ithaca-local-dev-session-key";
}

function toBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string) {
  const keyText = secret();
  if (!keyText) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyText),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export function getDemoCredentials() {
  if (process.env.NODE_ENV === "production") {
    return { username: process.env.DEMO_USERNAME ?? "", password: process.env.DEMO_PASSWORD ?? "" };
  }
  return {
    username: process.env.DEMO_USERNAME || "operator",
    password: process.env.DEMO_PASSWORD || "Ithaca2026!",
  };
}

export function hasDemoConfiguration() {
  const credentials = getDemoCredentials();
  return Boolean(
    credentials.username &&
      credentials.password &&
      (process.env.NODE_ENV !== "production" || process.env.DEMO_SESSION_SECRET)
  );
}

export async function createDemoSession() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${issuedAt}`;
  return `${payload}.${await sign(payload)}`;
}

export async function isValidDemoSession(token?: string) {
  if (!token) return false;
  const [issuedAtText, signature, extra] = token.split(".");
  const issuedAt = Number(issuedAtText);
  if (extra || !Number.isInteger(issuedAt) || !signature) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < 0 || age > SESSION_TTL_SECONDS) return false;
  const expected = await sign(issuedAtText);
  if (!expected || expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

export const demoSessionCookie = SESSION_COOKIE;
export const demoSessionMaxAge = SESSION_TTL_SECONDS;
