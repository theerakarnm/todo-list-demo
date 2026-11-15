// Renders the three emails with sample data for visual review: bun scripts/render-emails.ts <outDir>
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resetPasswordTemplate, verifyEmailTemplate, welcomeEmailTemplate } from "../src/worker/email/templates";

const outDir = process.argv[2];
if (!outDir) throw new Error("Usage: bun scripts/render-emails.ts <outDir>");

const origin = "https://jotlist.eukron.com";
const name = "สมชาย";
const emails = {
  "verify.html": verifyEmailTemplate(`${origin}/api/auth/verify-email?token=sample-token&callbackURL=%2Fverify-email`, name),
  "welcome.html": welcomeEmailTemplate(`${origin}/today`, name),
  "reset.html": resetPasswordTemplate(`${origin}/reset-password?token=sample-token`, name),
};

await mkdir(outDir, { recursive: true });
for (const [file, email] of Object.entries(emails)) {
  await writeFile(join(outDir, file), email.html);
  console.log(`wrote ${join(outDir, file)}`);
}
