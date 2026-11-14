import { execFileSync } from "node:child_process";
import { hashPassword } from "better-auth/crypto";
import { E2E_PASSWORD } from "./test-user";

/**
 * Adds a fresh email user to the local D1 for this run, as sign-up plus the
 * verification link would leave it: verified, with a password hashed by Better
 * Auth itself. No email is sent and no Turnstile check is needed. The smoke test
 * then signs in through the Login page.
 */
export default async function globalSetup() {
  const userId = crypto.randomUUID();
  const email = `e2e-${Date.now()}@jotlist.test`;
  const passwordHash = await hashPassword(E2E_PASSWORD);
  const sql = [
    `INSERT INTO user (id, name, email, email_verified) VALUES ('${userId}', 'e2e', '${email}', 1);`,
    "INSERT INTO account (id, account_id, provider_id, user_id, password)",
    `VALUES ('${crypto.randomUUID()}', '${userId}', 'credential', '${userId}', '${passwordHash}');`,
  ].join(" ");
  execFileSync("bunx", ["wrangler", "d1", "execute", "jotlist", "--local", "--command", sql], { stdio: ["ignore", "ignore", "inherit"] });

  // Playwright starts the test workers after this, so they see it.
  process.env.E2E_EMAIL = email;
}
