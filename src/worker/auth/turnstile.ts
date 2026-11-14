const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Asks Cloudflare whether a Turnstile token from the browser is real and unused. */
export async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  const response = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
  const result = await response.json<{ success?: boolean }>();
  return result.success === true;
}
