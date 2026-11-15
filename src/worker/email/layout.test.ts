import { describe, expect, it } from "vitest";
import { button, emailLayout, emailTokens, escapeHtml, greeting } from "./layout";

describe("escapeHtml", () => {
  it("escapes & < > \" and '", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  });
});

describe("greeting", () => {
  it("uses the name, or none when it is empty", () => {
    expect(greeting("สมชาย")).toBe("สวัสดี สมชาย,");
    expect(greeting("  ")).toBe("สวัสดี,");
    expect(greeting(undefined)).toBe("สวัสดี,");
  });
});

describe("emailLayout", () => {
  const html = emailLayout({ job: "001", content: "<p>BODY</p>" });

  it("is a full email-safe document that opts out of dark mode", () => {
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light">');
    expect(html).toContain(`<body bgcolor="${emailTokens.paper}"`);
  });

  it("has the header, the body and the colophon, and is fluid up to 600px", () => {
    expect(html).toContain("JOB 001 - JOTLIST");
    expect(html).toContain("BY EUKRON TEAM");
    expect(html).toContain("<p>BODY</p>");
    expect(html).toContain("COLOPHON - JOTLIST BY EUKRON TEAM");
    expect(html).toContain("PRINTED IN THREE INKS.");
    expect(html).toContain('width="600"');
    expect(html).toContain("max-width:600px");
  });

  it("uses no scripts, images or box-shadow", () => {
    expect(html).not.toMatch(/<script|<img|box-shadow/i);
  });

  it("adds the dotted band only when asked", () => {
    expect(html).not.toContain("radial-gradient(");
    expect(emailLayout({ job: "002", band: true, content: "" })).toContain("radial-gradient(");
  });
});

describe("button", () => {
  it("links the whole block and escapes the link", () => {
    const html = button(`https://x.test/?a=1&b="2"`, "ยืนยันอีเมล", "Confirm email");
    expect(html).toContain('href="https://x.test/?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain("ยืนยันอีเมล");
    expect(html).toContain("text-transform:uppercase");
  });
});

describe("web fonts", () => {
  it("loads the brand fonts with display=swap as an enhancement only", () => {
    const html = emailLayout({ job: "001", content: "" });
    expect(html).toMatch(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*Bricolage\+Grotesque[^"]*Noto\+Sans\+Thai[^"]*IBM\+Plex\+Mono[^"]*display=swap">/);
    expect(emailTokens.display).toContain("sans-serif");
  });
});
