import { toBase64Url } from "./base64url";
import { importP256KeyPair } from "./keys";

// VAPID (RFC 8292): a JWT signed with the app's key tells the push service who is sending.

/** The VAPID key pair (base64url uncompressed point and raw private scalar) and the contact URI. */
export type Vapid = { publicKey: string; privateKey: string; subject: string };

/** RFC 8292 allows up to 24 hours; 12 keeps a margin for clock skew. */
const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60;

/** The VAPID settings from the Worker secrets, or null when any of them is missing. */
export function vapidFrom(env: Env): Vapid | null {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

const encodeJson = (value: object) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));

/** The Authorization header for a push to `endpoint`: "vapid t=<jwt>, k=<public key>". */
export async function vapidAuthorization(endpoint: string, vapid: Vapid, now: number) {
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS,
    sub: vapid.subject,
  };
  const unsigned = `${encodeJson({ typ: "JWT", alg: "ES256" })}.${encodeJson(claims)}`;
  const { privateKey } = await importP256KeyPair(vapid.publicKey, vapid.privateKey, "ECDSA");
  // WebCrypto's ECDSA signature is r || s, the form ES256 needs.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsigned),
  );
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${vapid.publicKey}`;
}
