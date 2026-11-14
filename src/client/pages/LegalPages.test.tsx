import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { signedOut } from "../test/fake-api";
import { openPage } from "../test/render-app";

beforeEach(signedOut);

describe.each([
  { path: "/privacy", title: th.pages.privacy.title, legal: th.legal.privacy },
  { path: "/terms", title: th.pages.terms.title, legal: th.legal.terms },
])("$path", ({ path, title, legal }) => {
  it("shows every section in Thai and the contact email", async () => {
    await openPage(path);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    for (const section of legal.sections) {
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
    }
    const main = within(screen.getByRole("main"));
    expect(main.getByText(/contact@theerakarnm\.dev/)).toBeTruthy();
  });

  it("links back to the landing page", async () => {
    await openPage(path);

    expect(screen.getByRole("link", { name: th.legal.backHome }).getAttribute("href")).toBe("/");
  });
});

describe("/privacy", () => {
  it("names what is stored and who processes it", async () => {
    await openPage("/privacy");

    const text = screen.getByRole("main").textContent ?? "";
    for (const word of ["อีเมล", "งาน", "รูปภาพ", "push subscription", "Resend", "Cloudflare", "ลบบัญชี"]) {
      expect(text).toContain(word);
    }
  });
});
