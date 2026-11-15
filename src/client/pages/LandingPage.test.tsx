import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { signedOut } from "../test/fake-api";
import { openPage } from "../test/render-app";

beforeEach(signedOut);

describe("Landing page", () => {
  it("shows the hero, the four features and the start section", async () => {
    await openPage("/");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(th.landing.hero.highlight);
    for (const feature of [th.landing.features.capture, th.landing.features.today, th.landing.features.search, th.landing.features.sync]) {
      expect(screen.getByRole("heading", { level: 3, name: feature.title })).toBeTruthy();
    }
    expect(screen.getByRole("heading", { level: 2, name: th.landing.start.title })).toBeTruthy();
  });

  it("leads to Login, Signup and LINE sign-in", async () => {
    await openPage("/");

    expect(screen.getByRole("link", { name: th.landing.nav.logIn }).getAttribute("href")).toBe("/login");
    for (const link of screen.getAllByRole("link", { name: /เริ่มใช้ฟรี/ })) {
      expect(link.getAttribute("href")).toBe("/signup");
    }
    expect(screen.getByRole("button", { name: th.auth.continueWithLine })).toBeTruthy();
    expect(screen.getByText(th.landing.hero.signUpWith)).toBeTruthy();
  });

  it("has a footer with Privacy, Terms, the contact email and the copyright", async () => {
    await openPage("/");
    const footer = within(screen.getByRole("contentinfo"));

    expect(footer.getByRole("link", { name: th.footer.privacy }).getAttribute("href")).toBe("/privacy");
    expect(footer.getByRole("link", { name: th.footer.terms }).getAttribute("href")).toBe("/terms");
    expect(footer.getByRole("link", { name: /contact@theerakarnm\.dev/ }).getAttribute("href")).toBe(
      "mailto:contact@theerakarnm.dev",
    );
    expect(footer.getByText("© 2026 jotlist - Eukron Team")).toBeTruthy();
  });
});
