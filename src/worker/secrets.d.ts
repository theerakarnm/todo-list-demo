// Secrets and plain vars read from .dev.vars locally and Worker secrets in production.
// Declared by hand so the types do not depend on a local .dev.vars file.
// APP_ENV is not here: it is a var in wrangler.jsonc, so `bun run cf-typegen` declares it.
interface JotListSecrets {
  BETTER_AUTH_SECRET?: string;
  /** The app's public origin, e.g. https://jotlist.eukron.com. When unset, the request's origin is used. */
  BETTER_AUTH_URL?: string;
  LINE_LOGIN_CHANNEL_ID?: string;
  LINE_LOGIN_CHANNEL_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** When unset, emails are logged instead of sent (dev, tests, CI). */
  RESEND_API_KEY?: string;
  /** Sender address for auth emails, e.g. no-reply@mail.eukron.com. Never hard-code it. */
  EMAIL_FROM?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

// Both Env types: the global one (Hono's c.env) and Cloudflare.Env (cloudflare:test, cloudflare:workers).
interface Env extends JotListSecrets {}
declare namespace Cloudflare {
  interface Env extends JotListSecrets {}
}
