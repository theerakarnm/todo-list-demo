import { fromBase64Url, toBase64Url } from "./base64url";

/** An uncompressed P-256 point: 0x04, then 32 bytes of x and 32 bytes of y. */
const UNCOMPRESSED_POINT_LENGTH = 65;

type Algorithm = "ECDH" | "ECDSA";

const usagesFor = (algorithm: Algorithm) => ({
  privateKey: algorithm === "ECDH" ? ["deriveBits"] : ["sign"],
  publicKey: algorithm === "ECDH" ? [] : ["verify"],
});

function pointToJwk(publicKey: string): JsonWebKey {
  const point = fromBase64Url(publicKey);
  if (point.length !== UNCOMPRESSED_POINT_LENGTH || point[0] !== 4) {
    throw new Error("A P-256 public key must be a 65-byte uncompressed point");
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: toBase64Url(point.slice(1, 33)),
    y: toBase64Url(point.slice(33)),
  };
}

/** A P-256 public key from its base64url uncompressed point (a browser's p256dh, or the VAPID key). */
export function importP256PublicKey(publicKey: string, algorithm: Algorithm) {
  return crypto.subtle.importKey(
    "jwk",
    pointToJwk(publicKey),
    { name: algorithm, namedCurve: "P-256" },
    true,
    usagesFor(algorithm).publicKey,
  );
}

/**
 * A P-256 key pair from base64url text: the uncompressed public point and the
 * raw 32-byte private scalar d. WebCrypto cannot import a bare d, so it goes
 * in as a JWK with x and y taken from the public point.
 */
export async function importP256KeyPair(publicKey: string, privateKey: string, algorithm: Algorithm) {
  const jwk = { ...pointToJwk(publicKey), d: privateKey };
  const curve = { name: algorithm, namedCurve: "P-256" };
  const [importedPrivate, importedPublic] = await Promise.all([
    crypto.subtle.importKey("jwk", jwk, curve, false, usagesFor(algorithm).privateKey),
    importP256PublicKey(publicKey, algorithm),
  ]);
  return { privateKey: importedPrivate, publicKey: importedPublic } satisfies CryptoKeyPair;
}
