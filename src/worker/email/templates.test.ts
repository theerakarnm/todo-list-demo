import { describe, expect, it } from "vitest";
import { VERIFICATION_LINK_HOURS, verifyEmailTemplate } from "./templates";

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
