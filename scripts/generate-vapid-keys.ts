// Makes a VAPID key pair for Web Push, in the format the Worker reads (src/worker/push/vapid.ts):
// VAPID_PUBLIC_KEY is the base64url uncompressed P-256 point, VAPID_PRIVATE_KEY the base64url raw private scalar.
// Run `bun scripts/generate-vapid-keys.ts`, then put the two lines in .env and .dev.vars,
// or set them in production with `wrangler secret put`. Never commit the output.
import { Buffer } from "node:buffer";

const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("base64url");
const { d: privateKey } = await crypto.subtle.exportKey("jwk", keys.privateKey);

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
