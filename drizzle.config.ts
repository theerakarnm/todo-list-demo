import { defineConfig } from "drizzle-kit";

// Only generates SQL into drizzle/. Wrangler applies it:
// `bun run db:migrate:local` or `bun run db:migrate:remote`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/worker/db/schema.ts",
  out: "./drizzle",
});
