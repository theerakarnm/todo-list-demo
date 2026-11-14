import { describe, expect, it } from "vitest";
import { fromBase64Url, toBase64Url } from "./base64url";
import { encryptWithKeys } from "./encrypt";
import { importP256KeyPair } from "./keys";

// RFC 8291 section 5 and appendix A: one known message, keys and salt.
const RFC_8291 = {
  plaintext: "When I grow up, I want to be a watermelon",
  receiver: {
    p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
    auth: "BTBZMqHH6r4Tts7J_aSIgg",
  },
  senderPublicKey: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  senderPrivateKey: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

describe("encryptWithKeys", () => {
  it("reproduces the RFC 8291 example message byte for byte", async () => {
    const senderKeys = await importP256KeyPair(RFC_8291.senderPublicKey, RFC_8291.senderPrivateKey, "ECDH");

    const body = await encryptWithKeys(new TextEncoder().encode(RFC_8291.plaintext), RFC_8291.receiver, {
      salt: fromBase64Url(RFC_8291.salt),
      senderKeys,
    });

    expect(toBase64Url(body)).toBe(RFC_8291.body);
  });
});
