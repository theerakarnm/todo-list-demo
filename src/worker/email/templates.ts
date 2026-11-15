import {
  button,
  dashedBox,
  emailLayout,
  emailTokens,
  escapeHtml,
  greeting,
  headline,
  monoLabel,
  paragraph,
  rule,
  SUPPORT_EMAIL,
  wordmark,
} from "./layout";

/** How long the link in the verification email works. Better Auth's `expiresIn` is set from this too. */
export const VERIFICATION_LINK_HOURS = 24;

const RESET_LINK_HOURS = 1;

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
    button(link, "ยืนยันอีเมล", "CONFIRM EMAIL"),
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

const WELCOME_STEPS = [
  ["01", "เข้าสู่ระบบ", "SIGN IN"],
  ["02", "สร้างรายการแรกของคุณ", "WRITE YOUR FIRST LIST"],
  ["03", "จดต่อทุกวัน ติ๊กเมื่อเสร็จ", "KEEP JOTTING, TICK IT OFF"],
] as const;

function welcomeStep([number, thai, english]: (typeof WELCOME_STEPS)[number]) {
  const { ink, blue, display, thai: thaiFont, mono } = emailTokens;
  return `<tr>
<td width="80" valign="middle" style="padding:20px 0;border-bottom:2px solid ${ink};font-family:${display};font-size:48px;line-height:52px;font-weight:800;color:${blue}">${number}</td>
<td valign="middle" style="padding:20px 0;border-bottom:2px solid ${ink}"><div style="font-family:${thaiFont};font-size:19px;line-height:28px;font-weight:700;color:${ink}">${thai}</div><div style="font-family:${mono};font-size:13px;line-height:20px;letter-spacing:1px;color:${ink}">${english}</div></td>
</tr>`;
}

export function welcomeEmailTemplate(appLink: string, name: string) {
  const { ink, blue, display, mono } = emailTokens;
  const spacer = (height: number) => `<div style="height:${height}px;line-height:${height}px;font-size:0">&nbsp;</div>`;
  const stamp = `<div style="display:inline-block;border:3px solid ${blue};padding:8px 18px;text-align:center;transform:rotate(-4deg);color:${blue}"><div style="font-family:${display};font-size:24px;line-height:30px;font-weight:800;color:${blue}">ยืนยันแล้ว</div><div style="font-family:${mono};font-size:12px;line-height:16px;letter-spacing:1px;color:${ink}">VERIFIED</div></div>`;
  const support = `<a href="mailto:${SUPPORT_EMAIL}" style="color:${ink};text-decoration:underline">${SUPPORT_EMAIL}</a>`;
  const content = [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">${monoLabel("01 - ยินดีต้อนรับ / WELCOME")}</td><td align="right" valign="top" rowspan="2">${stamp}</td></tr><tr><td valign="top">${headline("ยินดีต้อนรับ", true)}</td></tr></table>`,
    paragraph("Welcome to jotlist.", "mono"),
    spacer(16),
    paragraph(`${escapeHtml(greeting(name))}<br>อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว บัญชี jotlist พร้อมใช้งาน`),
    paragraph("Your email is confirmed. Your jotlist account is ready.", "mono"),
    spacer(24),
    rule(),
    spacer(12),
    monoLabel("02 - เริ่มใช้งาน / GET STARTED - 01/03"),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${ink}">${WELCOME_STEPS.map(welcomeStep).join("")}</table>`,
    spacer(32),
    button(appLink, "เปิด jotlist", "OPEN JOTLIST"),
    spacer(32),
    dashedBox(
      [
        paragraph(`มีคำถาม? ติดต่อทีมงานได้ที่ ${support}`),
        `<p style="margin:0;font-family:${mono};font-size:13px;line-height:22px;color:${ink}">Questions? Write to the team at ${support}.</p>`,
      ].join(""),
    ),
  ].join("\n");

  const text = [
    "ยินดีต้อนรับ",
    "Welcome to jotlist.",
    "",
    greeting(name),
    "อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว บัญชี jotlist พร้อมใช้งาน",
    "Your email is confirmed. Your jotlist account is ready.",
    "",
    "เปิด jotlist / OPEN JOTLIST:",
    appLink,
    "",
    ...WELCOME_STEPS.map(([number, thai, english]) => `${number} ${thai} / ${english}`),
    "",
    `มีคำถาม? ติดต่อทีมงานได้ที่ ${SUPPORT_EMAIL}`,
    `Questions? Write to the team at ${SUPPORT_EMAIL}.`,
    "",
    "JotList",
  ].join("\n");

  return { subject: "ยินดีต้อนรับสู่ JotList", html: emailLayout({ job: "002", band: true, content }), text, link: appLink };
}

export function resetPasswordTemplate(link: string, name?: string) {
  const { mono, ink } = emailTokens;
  const href = escapeHtml(link);
  const spacer = (height: number) => `<div style="height:${height}px;line-height:${height}px;font-size:0">&nbsp;</div>`;
  const content = [
    wordmark(),
    rule(),
    spacer(16),
    monoLabel("01 - ตั้งรหัสผ่านใหม่ / RESET PASSWORD"),
    headline("ตั้งรหัสผ่านใหม่"),
    paragraph("Set a new password.", "mono"),
    spacer(16),
    paragraph(`${escapeHtml(greeting(name))}<br>มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี jotlist ของคุณ`),
    paragraph("We got a request to set a new password for your jotlist account.", "mono"),
    spacer(24),
    button(link, "ตั้งรหัสผ่านใหม่", "SET NEW PASSWORD"),
    `<p style="margin:12px 0 32px 0;font-family:${mono};font-size:13px;line-height:20px;letter-spacing:1px;text-transform:uppercase;color:${ink}">&#9650; ลิงก์ใช้ได้ ${RESET_LINK_HOURS} ชั่วโมง / LINK VALID ${RESET_LINK_HOURS} HOUR</p>`,
    dashedBox(
      [
        monoLabel("TEAR HERE - ปุ่มกดไม่ได้"),
        paragraph("คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ของคุณ"),
        `<p style="margin:0 0 8px 0;font-family:${mono};font-size:14px;line-height:22px;word-break:break-all"><a href="${href}" style="color:${ink};text-decoration:underline;word-break:break-all">${href}</a></p>`,
        `<p style="margin:0;font-family:${mono};font-size:13px;line-height:22px;color:${ink}">Button not working? Paste the link above into your browser.</p>`,
      ].join(""),
    ),
    spacer(24),
    paragraph("ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้"),
    paragraph("Didn't ask for this? Ignore this email. Your old password still works.", "mono"),
  ].join("\n");

  const text = [
    "ตั้งรหัสผ่านใหม่",
    "Set a new password.",
    "",
    greeting(name),
    `มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี jotlist ของคุณ กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${RESET_LINK_HOURS} ชั่วโมง)`,
    "We got a request to set a new password for your jotlist account. Open the link below (valid 1 hour).",
    "",
    link,
    "",
    "ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้",
    "Didn't ask for this? Ignore this email. Your old password still works.",
    "",
    "JotList",
  ].join("\n");

  return { subject: "ตั้งรหัสผ่านใหม่ - JotList", html: emailLayout({ job: "003", content }), text, link };
}
