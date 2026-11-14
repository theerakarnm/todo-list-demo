import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "../db/auth-schema";
import { sendEmail } from "../email/send-email";
import { resetPasswordTemplate, verifyEmailTemplate } from "../email/templates";
import { betterAuthLogger } from "./better-auth-logger";

/** Where links in auth emails land in the client app. */
const VERIFY_EMAIL_PAGE = "/verify-email";
const RESET_PASSWORD_PAGE = "/reset-password";

/** The app's origin: BETTER_AUTH_URL when set, else the origin of this request. */
export function appOrigin(env: Env, request: Request) {
  return env.BETTER_AUTH_URL || new URL(request.url).origin;
}

/**
 * Better Auth for one request. The Worker has no long-lived process,
 * so the auth instance is built from this request's env and origin.
 */
export function createAuth(env: Env, request: Request) {
  const origin = appOrigin(env, request);

  return betterAuth({
    baseURL: origin,
    basePath: "/api/auth",
    trustedOrigins: [origin],
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB), { provider: "sqlite", schema: authSchema }),
    logger: betterAuthLogger,
    // The Workers Rate Limiting bindings do this (middleware/rate-limit.ts).
    rateLimit: { enabled: false },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        const link = `${origin}${RESET_PASSWORD_PAGE}?token=${encodeURIComponent(token)}`;
        await sendEmail(env, { to: user.email, ...resetPasswordTemplate(link) });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      // An unverified user who tries to sign in gets a fresh link (the old one may be lost or expired).
      sendOnSignIn: true,
      async sendVerificationEmail({ user, url }) {
        const link = new URL(url);
        link.searchParams.set("callbackURL", VERIFY_EMAIL_PAGE);
        await sendEmail(env, { to: user.email, ...verifyEmailTemplate(link.href) });
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth["$Infer"]["Session"]["user"];
export type AuthSession = Auth["$Infer"]["Session"]["session"];
