import { applyD1Migrations, env } from "cloudflare:test";

// Runs before every worker test file, so each file starts with the full schema.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
