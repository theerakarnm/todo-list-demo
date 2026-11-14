import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { aFile, stubBrowserImages } from "../test/fake-images";
import { findPageAlert, openPage } from "../test/render-app";

const t = th.settingsAccount;

function sidebar() {
  return within(screen.getByRole("complementary", { name: th.nav.sidebar }));
}

function click(name: string, scope: Pick<typeof screen, "getByRole"> = screen) {
  act(() => scope.getByRole("button", { name }).click());
}

describe("Settings → Account: profile photo", () => {
  afterEach(() => vi.unstubAllGlobals());

  const photo = () => screen.queryByRole("img", { name: t.photoAlt })?.getAttribute("src");
  const sidebarPhoto = () => screen.getByRole("complementary", { name: th.nav.sidebar }).querySelector(".avatar img");

  it("shows the initial when there is no photo, and no remove button", async () => {
    await openPage("/app/settings");

    expect(photo()).toBeUndefined();
    expect(screen.getAllByText("น").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: t.removePhoto })).toBeNull();
  });

  it("shows the LINE picture when no photo was uploaded", async () => {
    signedInAs(testMe({ user: { image: "https://profile.line-scdn.net/narin" } }));
    await openPage("/app/settings");

    expect(photo()).toBe("https://profile.line-scdn.net/narin");
    expect(sidebarPhoto()?.getAttribute("src")).toBe("https://profile.line-scdn.net/narin");
  });

  it("uploads a new photo, square-cropped as WebP, showing it at once", async () => {
    stubBrowserImages({ width: 1200, height: 800 });
    const save = answerLater("PUT /api/me/avatar");
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.changePhoto), { target: { files: [aFile("me.jpg", "image/jpeg")] } });

    expect(await screen.findByRole("img", { name: t.photoAlt })).toBeTruthy();
    expect(photo()).toBe("blob:preview-1");
    expect(sidebarPhoto()?.getAttribute("src")).toBe("blob:preview-1");
    const sent = await vi.waitFor(async () => {
      const request = requestsTo("PUT /api/me/avatar")[0];
      if (!request) throw new Error("not sent yet");
      return request.clone().formData();
    });
    expect((sent.get("file") as Blob).type).toBe("image/webp");

    save.reply({ avatarKey: "u/user-1/avatar/new" });
    await waitFor(() => expect(photo()).toBe("/api/files/u/user-1/avatar/new"));
    expect(screen.getByRole("button", { name: t.removePhoto })).toBeTruthy();
  });

  it("goes back to what was shown and explains when the upload fails", async () => {
    stubBrowserImages();
    answer("PUT /api/me/avatar", apiError(413, "FILE_TOO_LARGE"));
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.changePhoto), { target: { files: [aFile("me.jpg", "image/jpeg")] } });

    expect(await screen.findByText(th.errors.api.FILE_TOO_LARGE)).toBeTruthy();
    expect(photo()).toBeUndefined();
  });

  it("removes the uploaded photo, falling back to the LINE picture", async () => {
    answer("DELETE /api/me/avatar", { avatarKey: null });
    signedInAs(
      testMe({ user: { image: "https://profile.line-scdn.net/narin" }, settings: { avatarKey: "u/user-1/avatar/old" } }),
    );
    await openPage("/app/settings");
    expect(photo()).toBe("/api/files/u/user-1/avatar/old");

    click(t.removePhoto);

    await waitFor(() => expect(photo()).toBe("https://profile.line-scdn.net/narin"));
    expect(screen.queryByRole("button", { name: t.removePhoto })).toBeNull();
    await waitFor(() => expect(requestsTo("DELETE /api/me/avatar")).toHaveLength(1));
  });

  it("puts the photo back and explains when removing it fails", async () => {
    answer("DELETE /api/me/avatar", apiError(500, "INTERNAL_ERROR"));
    signedInAs(testMe({ settings: { avatarKey: "u/user-1/avatar/old" } }));
    await openPage("/app/settings");

    click(t.removePhoto);

    expect(await screen.findByText(th.errors.api.INTERNAL_ERROR)).toBeTruthy();
    expect(photo()).toBe("/api/files/u/user-1/avatar/old");
  });
});

describe("Settings → Account: display name", () => {
  it("shows the new name at once and saves it", async () => {
    const save = answerLater("PATCH /api/settings");
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.nameLabel), { target: { value: "สมชาย" } });
    click(t.save);

    expect(await sidebar().findByText("สมชาย")).toBeTruthy();
    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ displayName: "สมชาย" });
    save.reply({ settings: testMe({ settings: { displayName: "สมชาย" } }).settings });
    expect(await screen.findByText(t.saved)).toBeTruthy();
  });

  it("puts the old name back and shows the error when the server refuses", async () => {
    answer("PATCH /api/settings", apiError(400, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง"));
    await openPage("/app/settings");

    fireEvent.change(screen.getByLabelText(t.nameLabel), { target: { value: "สมชาย" } });
    click(t.save);

    expect((await findPageAlert()).textContent).toContain("ข้อมูลไม่ถูกต้อง");
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
    answer("POST /api/auth/change-password", {});
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

    expect((await findPageAlert()).textContent).toContain("รหัสผ่านปัจจุบันไม่ถูกต้อง");
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
    answer("DELETE /api/account", new Response(null, { status: 204 }));
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
