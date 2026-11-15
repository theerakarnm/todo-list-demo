import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL } from "./layout";
import { VERIFICATION_LINK_HOURS, resetPasswordTemplate, verifyEmailTemplate, welcomeEmailTemplate } from "./templates";

const link = "https://jotlist.eukron.com/api/auth/verify-email?token=abc&callbackURL=%2Fverify-email";

describe("verifyEmailTemplate", () => {
  const email = verifyEmailTemplate(link, "สมชาย");

  it("keeps the subject", () => {
    expect(email.subject).toBe("ยืนยันอีเมลของคุณ - JotList");
    expect(email.link).toBe(link);
  });

  it("greets the user by name and says how long the link is valid", () => {
    expect(email.html).toContain("สวัสดี สมชาย,");
    expect(email.text).toContain("สวัสดี สมชาย,");
    expect(VERIFICATION_LINK_HOURS).toBe(24);
    expect(email.html).toContain(`ลิงก์ใช้ได้ ${VERIFICATION_LINK_HOURS} ชั่วโมง / LINK VALID ${VERIFICATION_LINK_HOURS} HOURS`);
    expect(email.text).toContain(`${VERIFICATION_LINK_HOURS}`);
  });

  it("greets without a name when the name is empty", () => {
    expect(verifyEmailTemplate(link, "").html).toContain("สวัสดี,");
  });

  it("puts the escaped link in the button and in the tear-off box", () => {
    const escaped = link.replaceAll("&", "&amp;");
    expect(email.html.split(`href="${escaped}"`)).toHaveLength(3);
    expect(email.html).toContain("TEAR HERE");
    expect(email.html).toContain("word-break:break-all");
    expect(email.html).toContain("JOB 001 - JOTLIST");
  });

  it("escapes the name", () => {
    const html = verifyEmailTemplate(link, "<script>alert(1)</script>").html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("has Thai and English text with the link alone on a line, first URL in the text", () => {
    const lines = email.text.split("\n");
    expect(lines).toContain(link);
    expect(email.text.match(/https?:\/\/\S+/)?.[0]).toBe(link);
    expect(email.text).toContain("Confirm your email address.");
    expect(email.text).toContain("ถ้าคุณไม่ได้สมัคร");
  });
});

describe("welcomeEmailTemplate", () => {
  const appLink = "https://jotlist.eukron.com/today";
  const email = welcomeEmailTemplate(appLink, "สมชาย");

  it("has the Thai subject and the link", () => {
    expect(email.subject).toBe("ยินดีต้อนรับสู่ JotList");
    expect(email.link).toBe(appLink);
  });

  it("greets by name, shows the stamp and the three steps", () => {
    expect(email.html).toContain("JOB 002 - JOTLIST");
    expect(email.html).toContain("สวัสดี สมชาย,");
    expect(email.html).toContain("ยืนยันแล้ว");
    expect(email.html).toContain("VERIFIED");
    for (const step of ["01", "02", "03", "เข้าสู่ระบบ", "SIGN IN", "สร้างรายการแรกของคุณ", "WRITE YOUR FIRST LIST"]) {
      expect(email.html).toContain(step);
    }
    expect(email.html).toContain("KEEP JOTTING, TICK IT OFF");
  });

  it("links the open button to the app and the support address as mailto", () => {
    expect(email.html).toContain(`href="${appLink}"`);
    expect(email.html).toContain("OPEN JOTLIST");
    expect(email.html).toContain(`href="mailto:${SUPPORT_EMAIL}"`);
    expect(email.text).toContain(SUPPORT_EMAIL);
  });

  it("escapes the name and has the app link first in the text", () => {
    expect(welcomeEmailTemplate(appLink, "<b>x</b>").html).not.toContain("<b>x</b>");
    expect(email.text.match(/https?:\/\/\S+/)?.[0]).toBe(appLink);
    expect(email.text.split("\n")).toContain(appLink);
  });
});

describe("resetPasswordTemplate", () => {
  const resetLink = "https://jotlist.eukron.com/reset-password?token=a&b=c";

  it("keeps the subject and says the link is valid 1 hour", () => {
    const email = resetPasswordTemplate(resetLink, "สมชาย");
    expect(email.subject).toBe("ตั้งรหัสผ่านใหม่ - JotList");
    expect(email.html).toContain("1 ชั่วโมง");
    expect(email.html).toContain("สวัสดี สมชาย,");
    expect(email.html).toContain("JOB 003 - JOTLIST");
  });

  it("works without a name, escapes the link, and keeps it first in the text", () => {
    const email = resetPasswordTemplate(resetLink);
    expect(email.html).toContain("สวัสดี,");
    expect(email.html).toContain('href="https://jotlist.eukron.com/reset-password?token=a&amp;b=c"');
    expect(email.text.match(/https?:\/\/\S+/)?.[0]).toBe(resetLink);
    expect(email.text.split("\n")).toContain(resetLink);
    expect(email.link).toBe(resetLink);
  });
});

describe("inline styles in every email", () => {
  const emails = {
    verify: verifyEmailTemplate(link, "สมชาย"),
    welcome: welcomeEmailTemplate("https://jotlist.eukron.com/today", "สมชาย"),
    reset: resetPasswordTemplate(link, "สมชาย"),
  };

  for (const [name, { html }] of Object.entries(emails)) {
    it(`${name}: every style attribute is well-formed and font names use single quotes`, () => {
      const values = [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1] ?? "");
      expect(values.length).toBeGreaterThan(0);
      for (const value of values) expect(value).toMatch(/^([a-z-]+:[^;]+;)*[a-z-]+:[^;]+$/);
      expect(html).toMatch(/style="[^"]*font-family:'Bricolage Grotesque'/);
      expect(html).not.toMatch(/"(Bricolage|Noto|IBM|Helvetica|SFMono|Courier|Sarabun)/);
      expect(html).not.toMatch(/style="[^"]*"[^\s>]/);
    });
  }
});

describe("verifyEmailTemplate copy", () => {
  it("thanks the user for signing up to use jotlist", () => {
    const email = verifyEmailTemplate(link, "สมชาย");
    expect(email.html).toContain("ขอบคุณที่สมัครใช้ jotlist");
    expect(email.text).toContain("ขอบคุณที่สมัครใช้ jotlist");
  });
});
