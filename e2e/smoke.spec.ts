import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD, e2eEmail } from "./test-user";

// `bun run test:e2e` migrates the local D1 and adds this run's user (e2e/global-setup.ts).
// The tests run in order and share that user.

/** Signs in through the Login page, with nothing able to reach LINE, Turnstile or Resend. */
async function signIn(page: Page) {
  await page.context().route(/^(?!http:\/\/localhost:5199\/)/, (route) => route.abort());
  // Signed out, /app goes to the Login page.
  await page.goto("/app");
  await page.getByLabel("อีเมล", { exact: true }).fill(e2eEmail());
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("sign in, quick add for tomorrow, complete with Undo, then add a subtask", async ({ page }) => {
  // The local database keeps earlier runs, so this run's task has its own name.
  const title = `ซื้อของขวัญวันเกิดแม่ ${Date.now()}`;

  await signIn(page);

  // A new account goes through onboarding once: keep the name, then skip the starter projects.
  await expect(page).toHaveURL(/\/onboarding\/1/);
  await page.getByRole("button", { name: "ต่อไป", exact: true }).click();
  await page.getByRole("button", { name: "ข้าม" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "วันนี้" })).toBeVisible();

  // Quick Add with Q: "พรุ่งนี้" becomes the date and leaves the title.
  await page.keyboard.press("q");
  const quickAdd = page.getByRole("dialog", { name: "เพิ่มด่วน" });
  await quickAdd.getByRole("textbox", { name: "งานใหม่", exact: true }).fill(`${title} พรุ่งนี้`);
  await expect(quickAdd.getByLabel("เลือกวันที่").locator("..")).toContainText("พรุ่งนี้");
  const saved = page.waitForResponse((response) => response.request().method() === "PUT" && response.ok());
  await page.keyboard.press("Enter");
  await saved;
  await expect(quickAdd).toBeHidden();

  // It is in Upcoming, under tomorrow.
  await page.getByRole("complementary").getByRole("link", { name: "เร็ว ๆ นี้" }).click();
  const tomorrow = page.getByRole("region", { name: /^พรุ่งนี้/ });
  const taskLink = tomorrow.getByRole("link", { name: title, exact: true });
  await expect(taskLink).toBeVisible();

  // Complete, then Undo within 5 seconds.
  await tomorrow.getByRole("button", { name: `ทำเครื่องหมายว่าเสร็จ: ${title}` }).click();
  await expect(taskLink).toBeHidden();
  await page.getByRole("button", { name: "เลิกทำ" }).click();
  await expect(taskLink).toBeVisible();

  // Open the TaskDrawer and add a subtask.
  await taskLink.click();
  const drawer = page.getByRole("dialog", { name: "รายละเอียดงาน" });
  await expect(drawer.getByRole("textbox", { name: "ชื่องาน" })).toHaveValue(title);
  const subtaskSaved = page.waitForResponse(
    (response) => response.url().includes("/api/subtasks/") && response.request().method() === "PUT" && response.ok(),
  );
  await drawer.getByRole("textbox", { name: "เพิ่มงานย่อย", exact: true }).fill("ห่อของขวัญ");
  await page.keyboard.press("Enter");
  await subtaskSaved;
  await expect(drawer.getByRole("textbox", { name: "ชื่องานย่อย" })).toHaveValue("ห่อของขวัญ");

  // After a reload the server has it all: still not completed, with its subtask.
  await page.reload();
  await expect(drawer.getByRole("textbox", { name: "ชื่องานย่อย" })).toHaveValue("ห่อของขวัญ");
  await expect(drawer.getByRole("button", { name: `ทำเครื่องหมายว่าเสร็จ: ${title}` })).toBeVisible();
});

test("attach an image to a task, view it, see 📎 1 on the row, then delete it", async ({ page }) => {
  const title = `ใบเสร็จค่าไฟ ${Date.now()}`;
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "วันนี้" })).toBeVisible();

  // A task due today, from Quick Add on the Today page.
  await page.keyboard.press("q");
  await page.getByRole("textbox", { name: "งานใหม่", exact: true }).fill(title);
  await page.keyboard.press("Enter");
  const taskLink = page.getByRole("main").getByRole("link", { name: title, exact: true });
  await taskLink.click();
  const drawer = page.getByRole("dialog", { name: "รายละเอียดงาน" });

  // Pick a real PNG: the browser converts it to WebP, uploads it, then shows the stored file.
  const uploaded = page.waitForResponse(
    (response) => response.url().endsWith("/attachments") && response.request().method() === "POST",
  );
  const served = page.waitForResponse((response) => response.url().includes("/api/files/u/"));
  await drawer.getByLabel("เพิ่มรูป", { exact: true }).setInputFiles("e2e/fixtures/receipt.png");
  expect((await uploaded).status()).toBe(201);
  // The private bucket answers through the owner-checked file route.
  expect((await served).status()).toBe(200);
  expect((await served).headers()["content-type"]).toBe("image/webp");
  await expect(drawer.getByRole("img", { name: "รูปที่ 1" })).toHaveAttribute("src", /^\/api\/files\/u\//);

  // Full-screen viewer: Esc closes it and leaves the drawer open.
  await drawer.getByRole("button", { name: "ดูรูปที่ 1" }).click();
  const viewer = page.getByRole("dialog", { name: "ดูรูปภาพ" });
  await expect(viewer.getByText("1 / 1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(drawer).toBeVisible();

  // The task row shows 📎 1.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  const row = page.getByRole("main").locator(".task-row", { hasText: title });
  await expect(row.getByText("📎 1")).toBeVisible();

  // Delete the image: the gallery is empty and the 📎 goes.
  await taskLink.click();
  const deleted = page.waitForResponse(
    (response) => response.url().includes("/api/attachments/") && response.request().method() === "DELETE",
  );
  await drawer.getByRole("button", { name: "ลบรูปที่ 1" }).click();
  expect((await deleted).ok()).toBe(true);
  await expect(drawer.getByText("รูปภาพ - 0/10")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(row.getByText("📎 1")).toBeHidden();
});
