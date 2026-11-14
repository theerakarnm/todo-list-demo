import { expect, test } from "@playwright/test";

// The signed-in user is the development placeholder (src/worker/middleware/current-user.ts),
// so the local D1 must be migrated first: `bun run db:migrate:local`.

test("quick add for tomorrow, complete with Undo, then add a subtask", async ({ page }) => {
  // The local database keeps earlier runs, so this run's task has its own name.
  const title = `ซื้อของขวัญวันเกิดแม่ ${Date.now()}`;

  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

  // Quick Add with Q: "พรุ่งนี้" becomes the date and leaves the title.
  await page.keyboard.press("q");
  const quickAdd = page.getByRole("dialog", { name: "quick add" });
  await quickAdd.getByRole("textbox", { name: "งานใหม่ / new task" }).fill(`${title} พรุ่งนี้`);
  await expect(quickAdd.getByLabel("เลือกวันที่").locator("..")).toContainText("พรุ่งนี้");
  const saved = page.waitForResponse((response) => response.request().method() === "PUT" && response.ok());
  await page.keyboard.press("Enter");
  await saved;
  await expect(quickAdd).toBeHidden();

  // It is in Upcoming, under tomorrow.
  await page.getByRole("complementary").getByRole("link", { name: "Upcoming" }).click();
  const tomorrow = page.getByRole("region", { name: /^พรุ่งนี้/ });
  const taskLink = tomorrow.getByRole("link", { name: title, exact: true });
  await expect(taskLink).toBeVisible();

  // Complete, then Undo within 5 seconds.
  await tomorrow.getByRole("button", { name: `ทำเครื่องหมายว่าเสร็จ: ${title}` }).click();
  await expect(taskLink).toBeHidden();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(taskLink).toBeVisible();

  // Open the TaskDrawer and add a subtask.
  await taskLink.click();
  const drawer = page.getByRole("dialog", { name: "รายละเอียดงาน" });
  await expect(drawer.getByRole("textbox", { name: "ชื่องาน" })).toHaveValue(title);
  const subtaskSaved = page.waitForResponse(
    (response) => response.url().includes("/api/subtasks/") && response.request().method() === "PUT" && response.ok(),
  );
  await drawer.getByRole("textbox", { name: "เพิ่มงานย่อย / add subtask" }).fill("ห่อของขวัญ");
  await page.keyboard.press("Enter");
  await subtaskSaved;
  await expect(drawer.getByRole("textbox", { name: "ชื่องานย่อย" })).toHaveValue("ห่อของขวัญ");

  // After a reload the server has it all: still not completed, with its subtask.
  await page.reload();
  await expect(drawer.getByRole("textbox", { name: "ชื่องานย่อย" })).toHaveValue("ห่อของขวัญ");
  await expect(drawer.getByRole("button", { name: `ทำเครื่องหมายว่าเสร็จ: ${title}` })).toBeVisible();
});
