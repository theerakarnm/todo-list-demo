import { button, dashedBox, emailLayout, emailTokens, escapeHtml, greeting, headline, monoLabel, paragraph, rule, wordmark } from "./layout";
import type { Email } from "./send-email";

/** How long the link in the verification email works. Better Auth's `expiresIn` is set from this too. */
export const VERIFICATION_LINK_HOURS = 24;

// Short, plain Thai auth emails. The link is on its own line in the text part.

type AuthEmail = Omit<Email, "to">;

function authEmail(subject: string, intro: string, action: string, link: string, note: string): AuthEmail {
  return {
    subject,
    link,
    text: [intro, "", `${action}:`, link, "", note, "", "JotList"].join("\n"),
    html: [
      `<p>${intro}</p>`,
      `<p><a href="${link}">${action}</a></p>`,
      `<p>${note}</p>`,
      "<p>JotList</p>",
    ].join(""),
  };
}

export function verifyEmailTemplate(link: string, name: string) {
  const href = escapeHtml(link);
  const mono = emailTokens.mono;
  const content = [
    wordmark(),
    rule(),
    `<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>`,
    monoLabel("01 - ยืนยันอีเมล / VERIFY EMAIL"),
    headline("ยืนยันอีเมลของคุณ"),
    paragraph("Confirm your email address.", "mono"),
    `<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>`,
    paragraph(`${escapeHtml(greeting(name))}<br>ขอบคุณที่สมัคร jotlist กดปุ่มด้านล่างเพื่อยืนยันว่าอีเมลนี้เป็นของคุณ แล้วเริ่มจดรายการแรกได้เลย`),
    paragraph("Thanks for signing up. Press the button below to confirm this email is yours.", "mono"),
    `<div style="height:24px;line-height:24px;font-size:0">&nbsp;</div>`,
    button(link, "ยืนยันอีเมล", "Confirm email"),
    `<p style="margin:12px 0 32px 0;font-family:${mono};font-size:13px;line-height:20px;letter-spacing:1px;text-transform:uppercase;color:${emailTokens.ink}">&#9650; ลิงก์ใช้ได้ ${VERIFICATION_LINK_HOURS} ชั่วโมง / LINK VALID ${VERIFICATION_LINK_HOURS} HOURS</p>`,
    dashedBox(
      [
        monoLabel("TEAR HERE - ปุ่มกดไม่ได้"),
        paragraph("คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ของคุณ"),
        `<p style="margin:0 0 8px 0;font-family:${mono};font-size:14px;line-height:22px;word-break:break-all"><a href="${href}" style="color:${emailTokens.ink};text-decoration:underline;word-break:break-all">${href}</a></p>`,
        `<p style="margin:0;font-family:${mono};font-size:13px;line-height:22px;color:${emailTokens.ink}">Button not working? Paste the link above into your browser.</p>`,
      ].join(""),
    ),
    `<div style="height:24px;line-height:24px;font-size:0">&nbsp;</div>`,
    paragraph("ถ้าคุณไม่ได้สมัคร jotlist ไม่ต้องทำอะไร ข้ามอีเมลนี้ได้เลย"),
    paragraph("Didn't sign up? Ignore this email.", "mono"),
  ].join("\n");

  const text = [
    "ยืนยันอีเมลของคุณ",
    "Confirm your email address.",
    "",
    greeting(name),
    "ขอบคุณที่สมัคร jotlist กดลิงก์ด้านล่างเพื่อยืนยันว่าอีเมลนี้เป็นของคุณ",
    "Thanks for signing up. Open the link below to confirm this email is yours.",
    "",
    link,
    "",
    `ลิงก์ใช้ได้ ${VERIFICATION_LINK_HOURS} ชั่วโมง / LINK VALID ${VERIFICATION_LINK_HOURS} HOURS`,
    "",
    "ถ้าคุณไม่ได้สมัคร jotlist ไม่ต้องทำอะไร ข้ามอีเมลนี้ได้เลย",
    "Didn't sign up? Ignore this email.",
    "",
    "JotList",
  ].join("\n");

  return { subject: "ยืนยันอีเมลของคุณ - JotList", html: emailLayout({ job: "001", content }), text, link };
}

export function resetPasswordTemplate(link: string) {
  return authEmail(
    "ตั้งรหัสผ่านใหม่ - JotList",
    "มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี JotList ของคุณ",
    "กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ 1 ชั่วโมง)",
    link,
    "ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้",
  );
}
