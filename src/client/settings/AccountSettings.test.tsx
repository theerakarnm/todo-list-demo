import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import {
  answer,
  answerLater,
  apiError,
  lastJsonSentTo,
  requestsTo,
  signedInAs,
  signedOut,
  testMe,
} from "../test/fake-api";
import { openPage } from "../test/render-app";

const t = th.settingsAccount;

function sidebar() {
  return within(screen.getByRole("complementary", { name: th.nav.sidebar }));
}

function click(name: string, scope: Pick<typeof screen, "getByRole"> = screen) {
  act(() => scope.getByRole("button", { name }).click());
}

describe("Settings → Account: display name", () => {
  it("shows the new name at once and saves it", async () => {
    const save = answerLater("PATCH /api/settings");
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.nameLabel), { target: { value: "สมชาย" } });
    click(t.save);

    expect(await sidebar().findByText("สมชาย")).toBeTruthy();
    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ displayName: "สมชาย" });
    save.reply({ body: { settings: testMe({ settings: { displayName: "สมชาย" } }).settings } });
    expect(await screen.findByText(t.saved)).toBeTruthy();
  });

  it("puts the old name back and shows the error when the server refuses", async () => {
    answer("PATCH /api/settings", apiError(400, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง"));
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.nameLabel), { target: { value: "สมชาย" } });
    click(t.save);

    expect((await screen.findByRole("alert")).textContent).toContain("ข้อมูลไม่ถูกต้อง");
    expect(sidebar().getByText("นรินทร์ ก.")).toBeTruthy();
  });
});

describe("Settings → Account: email and password", () => {
  it("shows the email read-only", async () => {
    await openPage("/app/settings");

    const email = screen.getByLabelText<HTMLInputElement>(t.emailLabel);
    expect(email.value).toBe("narin@example.com");
    expect(email.readOnly).toBe(true);
  });

  it("hides change password for a LINE-only account", async () => {
    signedInAs(testMe({ user: { email: null, hasPassword: false, hasLine: true } }));

    await openPage("/app/settings");

    expect(screen.getByLabelText<HTMLInputElement>(t.emailLabel).value).toBe(t.noEmail);
    expect(screen.queryByRole("button", { name: t.changePassword })).toBeNull();
  });

  it("changes the password", async () => {
    answer("POST /api/auth/change-password", { body: {} });
    await openPage("/app/settings");

    click(t.changePassword);
    fireEvent.change(screen.getByLabelText(t.currentPassword), { target: { value: "old-horse-11" } });
    fireEvent.change(screen.getByLabelText(t.newPassword), { target: { value: "new-horse-22" } });
    click(t.savePassword);

    expect(await screen.findByText(t.passwordChanged)).toBeTruthy();
    expect(await lastJsonSentTo("POST /api/auth/change-password")).toEqual({
      currentPassword: "old-horse-11",
      newPassword: "new-horse-22",
      revokeOtherSessions: true,
    });
  });

  it("marks a wrong current password", async () => {
    answer("POST /api/auth/change-password", apiError(400, "WRONG_PASSWORD", "รหัสผ่านปัจจุบันไม่ถูกต้อง"));
    await openPage("/app/settings");

    click(t.changePassword);
    fireEvent.change(screen.getByLabelText(t.currentPassword), { target: { value: "wrong-pass-1" } });
    fireEvent.change(screen.getByLabelText(t.newPassword), { target: { value: "new-horse-22" } });
    click(t.savePassword);

    expect((await screen.findByRole("alert")).textContent).toContain("รหัสผ่านปัจจุบันไม่ถูกต้อง");
    expect(screen.getByLabelText(t.currentPassword).getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Settings → Account: delete account", () => {
  it("asks first, and Cancel deletes nothing", async () => {
    await openPage("/app/settings");

    click(t.deleteButton);
    const dialog = screen.getByRole("dialog", { name: t.deleteConfirmTitle });
    click(t.cancel, within(dialog));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(requestsTo("DELETE /api/account")).toHaveLength(0);
  });

  it("deletes the account, signs out and goes to the landing page", async () => {
    answer("DELETE /api/account", { status: 204 });
    const router = await openPage("/app/settings");

    click(t.deleteButton);
    signedOut();
    click(t.deleteConfirm, within(screen.getByRole("dialog")));

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(requestsTo("DELETE /api/account")).toHaveLength(1);
    await act(() => router.navigate("/app/today"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});
