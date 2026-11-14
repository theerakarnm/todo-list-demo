import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { LIMITS } from "../../shared/constants";
import * as authSchema from "../db/auth-schema";
import { createUserSettingsOnce } from "../db/user-settings";
import { sendEmail } from "../email/send-email";
import { resetPasswordTemplate, verifyEmailTemplate } from "../email/templates";
import { createBetterAuthLogger } from "./better-auth-logger";
import { isLinePlaceholderEmail, lineProfileToUser } from "./line-linking";

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
 * `requestId` goes on Better Auth's log lines.
 */
export function createAuth(env: Env, request: Request, requestId?: string) {
  const origin = appOrigin(env, request);

  return betterAuth({
    baseURL: origin,
    basePath: "/api/auth",
    trustedOrigins: [origin],
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB), { provider: "sqlite", schema: authSchema }),
    logger: createBetterAuthLogger(requestId),
    // The Workers Rate Limiting bindings do this (middleware/rate-limit.ts).
    rateLimit: { enabled: false },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: LIMITS.passwordMinLength,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        if (isLinePlaceholderEmail(user.email)) return;
        const link = `${origin}${RESET_PASSWORD_PAGE}?token=${encodeURIComponent(token)}`;
        await sendEmail(env, { to: user.email, ...resetPasswordTemplate(link) });
      },
    },
    socialProviders: {
      line: {
        clientId: env.LINE_LOGIN_CHANNEL_ID ?? "",
        clientSecret: env.LINE_LOGIN_CHANNEL_SECRET ?? "",
        // Better Auth's LINE provider asks for openid, profile and email by default.
        mapProfileToUser: (profile) => lineProfileToUser(env.DB, profile),
      },
    },
    databaseHooks: {
      session: {
        create: {
          // The first sign-in, with any provider, creates the user's settings row.
          after: (session) => createUserSettingsOnce(env.DB, session.userId),
        },
      },
    },
    // OAuth errors (e.g. the user cancels on LINE) come back to the login page as ?error=...
    onAPIError: { errorURL: `${origin}/login` },
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
