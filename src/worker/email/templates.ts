import type { Email } from "./send-email";

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

export function verifyEmailTemplate(link: string) {
  return authEmail(
    "ยืนยันอีเมลของคุณ - JotList",
    "ขอบคุณที่สมัครใช้ JotList",
    "กดลิงก์นี้เพื่อยืนยันอีเมล",
    link,
    "ถ้าคุณไม่ได้สมัคร ไม่ต้องทำอะไร",
  );
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
