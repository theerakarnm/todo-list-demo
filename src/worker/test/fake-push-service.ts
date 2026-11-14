import { toBase64Url } from "../push/base64url";
import { importP256PublicKey } from "../push/keys";

/** Every endpoint the fake push service hands out starts with this. */
export const FAKE_PUSH_ORIGIN = "https://push.test";

export type FakeSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export type ReceivedPush = { endpoint: string; headers: Headers; payload: unknown };

type Browser = { privateKey: CryptoKey; publicKey: Uint8Array; auth: Uint8Array };

const encoder = new TextEncoder();

async function hkdf(salt: Uint8Array, secret: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** What a browser does with an aes128gcm push body (RFC 8291 and RFC 8188), written from the receiving side. */
async function decrypt(body: Uint8Array, browser: Browser) {
  const salt = body.slice(0, 16);
  const keyIdLength = body[20] ?? 0;
  const senderPublic = body.slice(21, 21 + keyIdLength);
  const ciphertext = body.slice(21 + keyIdLength);

  const senderKey = await importP256PublicKey(toBase64Url(senderPublic), "ECDH");
  const ecdh = { name: "ECDH", public: senderKey } as SubtleCryptoDeriveKeyAlgorithm;
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, browser.privateKey, 256));
  const info = new Uint8Array([...encoder.encode("WebPush: info\0"), ...browser.publicKey, ...senderPublic]);
  const ikm = await hkdf(browser.auth, shared, info, 32);
  const key = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  const record = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aesKey, ciphertext));
  // The record ends with the 0x02 delimiter, then any zero padding.
  const end = record.findLastIndex((byte) => byte !== 0);
  if (record[end] !== 2) throw new Error("The push record does not end with the 0x02 delimiter");
  return new TextDecoder().decode(record.slice(0, end));
}

/**
 * A stand-in for the browsers' push services. `subscribe` makes a browser
 * subscription (a real P-256 key pair and auth secret), and every push sent
 * to it is decrypted the way the browser would, then kept in `received`.
 * `answer` makes an endpoint reply with another status, e.g. 410 Gone.
 */
export function fakePushService() {
  const browsers = new Map<string, Browser>();
  const statuses = new Map<string, number>();
  const received: ReceivedPush[] = [];

  return {
    received,

    async subscribe(): Promise<FakeSubscription> {
      const keys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
        "deriveBits",
      ])) as CryptoKeyPair;
      const publicKey = new Uint8Array((await crypto.subtle.exportKey("raw", keys.publicKey)) as ArrayBuffer);
      const auth = crypto.getRandomValues(new Uint8Array(16));
      const endpoint = `${FAKE_PUSH_ORIGIN}/send/${crypto.randomUUID()}`;
      browsers.set(endpoint, { privateKey: keys.privateKey, publicKey, auth });
      return { endpoint, keys: { p256dh: toBase64Url(publicKey), auth: toBase64Url(auth) } };
    },

    answer(endpoint: string, status: number) {
      statuses.set(endpoint, status);
    },

    /** The decrypted payloads delivered to one endpoint. */
    payloadsTo(endpoint: string) {
      return received.filter((push) => push.endpoint === endpoint).map((push) => push.payload);
    },

    handles(url: string) {
      return url.startsWith(`${FAKE_PUSH_ORIGIN}/`);
    },

    handle: async (request: Request) => {
      const status = statuses.get(request.url) ?? 201;
      const browser = browsers.get(request.url);
      if (status >= 300 || !browser) return new Response(null, { status: browser ? status : 404 });
      const body = new Uint8Array(await request.arrayBuffer());
      const payload = JSON.parse(await decrypt(body, browser));
      received.push({ endpoint: request.url, headers: request.headers, payload });
      return new Response(null, { status });
    },
  };
}

export type FakePushService = ReturnType<typeof fakePushService>;
