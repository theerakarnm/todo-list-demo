import { fromBase64Url } from "./base64url";
import { importP256PublicKey } from "./keys";

// Web Push message encryption: RFC 8291 on top of the aes128gcm content coding of RFC 8188.

/** The keys a browser's PushSubscription hands out, base64url. */
export type SubscriptionKeys = { p256dh: string; auth: string };

/** The record size in the header. A push message is one record, so any size above it works. */
const RECORD_SIZE = 4096;
/** Ends the last (here: only) record, RFC 8188 section 2. */
const LAST_RECORD_DELIMITER = 2;

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]) {
  const joined = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

async function hkdf(salt: Uint8Array, secret: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

type Sender = { salt: Uint8Array; senderKeys: CryptoKeyPair };

/**
 * The encrypted body for one push message, with a given salt and sender key
 * pair. Real sends use `encryptPayload`, which makes both fresh; tests pass
 * the RFC 8291 values here.
 */
export async function encryptWithKeys(plaintext: Uint8Array, receiver: SubscriptionKeys, { salt, senderKeys }: Sender) {
  const receiverPublicBytes = fromBase64Url(receiver.p256dh);
  const receiverPublicKey = await importP256PublicKey(receiver.p256dh, "ECDH");
  const senderPublicBytes = new Uint8Array((await crypto.subtle.exportKey("raw", senderKeys.publicKey)) as ArrayBuffer);

  // The Workers types call this field `$public`; at runtime it is the standard `public`.
  const ecdh = { name: "ECDH", public: receiverPublicKey } as SubtleCryptoDeriveKeyAlgorithm;
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(ecdh, senderKeys.privateKey, 256));
  const keyInfo = concat(encoder.encode("WebPush: info\0"), receiverPublicBytes, senderPublicBytes);
  const ikm = await hkdf(fromBase64Url(receiver.auth), sharedSecret, keyInfo, 32);
  const contentKey = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const record = concat(plaintext, Uint8Array.of(LAST_RECORD_DELIMITER));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, record));

  // Header: salt (16) | record size (4, big-endian) | key id length (1) | key id = sender public key.
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, RECORD_SIZE);
  return concat(salt, recordSize, Uint8Array.of(senderPublicBytes.length), senderPublicBytes, ciphertext);
}

/** The encrypted body for one push message, with a fresh salt and sender key pair. */
export async function encryptPayload(plaintext: Uint8Array, receiver: SubscriptionKeys) {
  const senderKeys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  return encryptWithKeys(plaintext, receiver, { salt: crypto.getRandomValues(new Uint8Array(16)), senderKeys });
}
