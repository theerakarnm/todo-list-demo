/** The password of the user e2e/global-setup.ts adds for each run. */
export const E2E_PASSWORD = "e2e-correct-horse-1";

/** The email of this run's user, set by e2e/global-setup.ts. */
export function e2eEmail() {
  const email = process.env.E2E_EMAIL;
  if (!email) throw new Error("E2E_EMAIL is not set: run the tests with `bun run test:e2e`");
  return email;
}
