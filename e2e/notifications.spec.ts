import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, e2eEmail } from "./test-user";

// The browser push switch is left to the component tests: subscribing in a real
// browser would register with a real push service. This test covers the daily digest.

test("turn on the daily digest, set a time and find both after a reload", async ({ page }) => {
  await page.context().route(/^(?!http:\/\/localhost:5199\/)/, (route) => route.abort());

  await page.goto("/app/settings?tab=notifications");
  await page.getByLabel("อีเมล / email").fill(e2eEmail());
  await page.getByLabel("รหัสผ่าน / password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  // A new account goes through onboarding once; this test may run before or after the smoke test.
  const settingsTab = page.getByRole("tab", { name: "Notifications" });
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await settingsTab.or(continueButton).waitFor();
  if (await continueButton.isVisible()) {
    await continueButton.click();
    await page.getByRole("button", { name: "Skip" }).click();
    await page.goto("/app/settings?tab=notifications");
  }

  const digest = page.getByRole("checkbox", { name: "สรุปงานประจำวัน / daily digest" });
  const time = page.getByLabel("ส่งเวลา / time");
  await expect(digest).not.toBeChecked();

  const switchSaved = page.waitForResponse((response) => response.request().method() === "PATCH" && response.ok());
  await digest.check();
  await switchSaved;

  const timeSaved = page.waitForResponse((response) => response.request().method() === "PATCH" && response.ok());
  await time.fill("06:45");
  await timeSaved;

  await page.reload();
  await expect(page.getByRole("tab", { name: "Notifications" })).toHaveAttribute("aria-selected", "true");
  await expect(digest).toBeChecked();
  await expect(time).toHaveValue("06:45");
});
