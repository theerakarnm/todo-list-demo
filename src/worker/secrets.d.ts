// Secrets and plain vars read from .dev.vars locally and Worker secrets in production.
// Declared by hand so the types do not depend on a local .dev.vars file.
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET?: string;
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
}
