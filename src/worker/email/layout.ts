/** The design tokens of the emails: the app's own values (src/client/styles/tokens.css). */
export const emailTokens = {
  paper: "#f2ede1",
  ink: "#1a1a1a",
  blue: "#0078bf",
  orange: "#ff6c2f",
  green: "#003223",
  muted: "#5c5849",
  white: "#ffffff",
  display: `'Bricolage Grotesque', 'Noto Sans Thai', 'Helvetica Neue', Arial, sans-serif`,
  thai: `'Noto Sans Thai', 'Sarabun', Tahoma, 'Helvetica Neue', Arial, sans-serif`,
  mono: `'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace`,
} as const;

const t = emailTokens;

/** The one address users can write to. */
export const SUPPORT_EMAIL = "contact@theerakarnm.dev";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

/** Greeting line shared by the emails: "สวัสดี <name>," or just "สวัสดี," without a name. */
export function greeting(name: string | undefined) {
  const trimmed = name?.trim();
  return trimmed ? `สวัสดี ${trimmed},` : "สวัสดี,";
}

const cell = (style: string) => `${style};background-color:${t.paper}`;

/** A small uppercase mono line, e.g. "01 - ยืนยันอีเมล / VERIFY EMAIL". */
export function monoLabel(text: string) {
  return `<p style="margin:0 0 12px 0;font-family:${t.mono};font-size:13px;line-height:20px;letter-spacing:1px;color:${t.ink}">${escapeHtml(text)}</p>`;
}

export function paragraph(text: string, kind: "thai" | "mono" = "thai") {
  const font = kind === "thai" ? `font-family:${t.thai};font-size:17px;line-height:28px` : `font-family:${t.mono};font-size:14px;line-height:24px`;
  return `<p style="margin:0 0 8px 0;${font};color:${t.ink}">${text}</p>`;
}

export function headline(text: string, shadow = false) {
  const textShadow = shadow ? `;text-shadow:-3px -3px 0 ${t.orange},3px 3px 0 ${t.blue}` : "";
  return `<h1 style="margin:0 0 16px 0;font-family:${t.display};font-size:44px;line-height:56px;font-weight:800;color:${t.ink}${textShadow}">${escapeHtml(text)}</h1>`;
}

/** The big "jotlist" wordmark: live text with an orange and blue offset (plain black where text-shadow is unsupported). */
export function wordmark() {
  return `<div style="margin:0 0 24px 0;font-family:${t.display};font-size:72px;line-height:80px;font-weight:800;letter-spacing:-4px;color:${t.ink};text-shadow:-3px -3px 0 ${t.orange},3px 3px 0 ${t.blue}">jotlist</div>`;
}

export function rule(weight = 2) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="${weight}" bgcolor="${t.ink}" style="height:${weight}px;line-height:${weight}px;font-size:0;background-color:${t.ink}">&nbsp;</td></tr></table>`;
}

/** A near-black button with an orange offset shadow built from table cells (box-shadow is dropped by Outlook). */
export function button(href: string, thaiLabel: string, englishLabel: string) {
  const shadow = 8;
  const orange = `bgcolor="${t.orange}" style="background-color:${t.orange}"`;
  const gap = `width="${shadow}" height="${shadow}" bgcolor="${t.paper}" style="width:${shadow}px;height:${shadow}px;line-height:${shadow}px;font-size:0;background-color:${t.paper}"`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:380px">
<tr>
<td bgcolor="${t.ink}" style="background-color:${t.ink}"><a href="${escapeHtml(href)}" style="display:block;padding:20px 28px;font-family:${t.thai};text-decoration:none;color:${t.white}"><span style="display:block;font-size:22px;line-height:30px;font-weight:700;color:${t.white}">${escapeHtml(thaiLabel)}</span><span style="display:block;font-family:${t.mono};font-size:14px;line-height:22px;letter-spacing:1px;text-transform:uppercase;color:${t.white}">${escapeHtml(englishLabel)}</span></a></td>
<td width="${shadow}" valign="top" ${orange}><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td ${gap}>&nbsp;</td></tr></table></td>
</tr>
<tr>
<td ${orange}><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td ${gap}>&nbsp;</td><td height="${shadow}" ${orange}>&nbsp;</td></tr></table></td>
<td width="${shadow}" height="${shadow}" ${orange}>&nbsp;</td>
</tr>
</table>`;
}

/** A dashed black box, used for the tear-off link and the support note. */
export function dashedBox(content: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${t.paper}" style="padding:24px 30px;background-color:${t.paper};border:2px dashed ${t.ink}">${content}</td></tr></table>`;
}

function swatches() {
  const swatch = (color: string) =>
    `<td width="24" height="24" bgcolor="${color}" style="width:24px;height:24px;line-height:24px;font-size:0;background-color:${color}">&nbsp;</td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${[t.blue, t.orange, t.green, t.ink].map(swatch).join("")}</tr></table>`;
}

const monoSmall = `font-family:${t.mono};font-size:12px;line-height:22px;letter-spacing:1px;text-transform:uppercase;color:${t.ink}`;

type Layout = {
  /** Shown as "JOB 00N - JOTLIST" in the header. */
  job: string;
  /** The dotted blue band under the header. */
  band?: boolean;
  /** Body blocks, already HTML-safe. */
  content: string;
};

/**
 * The shared HTML shell of every JotList email: header, body, colophon footer.
 * Table layout and inline styles only. The colours are set explicitly and the page opts out
 * of dark mode, so dark-mode clients keep the cream paper and the dark ink.
 */
export function emailLayout({ job, band = false, content }: Layout) {
  const rowBorder = (side: "bottom" | "top") => `border-${side}:2px solid ${t.ink}`;
  const bandRow = band
    ? `<tr><td height="24" bgcolor="${t.paper}" style="height:24px;line-height:24px;font-size:0;background-color:${t.paper};background-image:radial-gradient(${t.blue} 30%,transparent 32%);background-size:8px 8px;${rowBorder("bottom")}">&nbsp;</td></tr>`
    : "";
  return `<!doctype html>
<html lang="th" style="background-color:${t.paper}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>JotList</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Noto+Sans+Thai:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{color-scheme:light only;supported-color-schemes:light only}
@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}}
</style>
</head>
<body bgcolor="${t.paper}" style="margin:0;padding:0;background-color:${t.paper};color:${t.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.paper}" style="width:100%;background-color:${t.paper}">
<tr><td align="center" bgcolor="${t.paper}" style="background-color:${t.paper}">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.paper}" style="width:100%;max-width:600px;background-color:${t.paper}">
<tr><td class="px" style="${cell(`padding:20px 24px;${rowBorder("bottom")}`)}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" style="${monoSmall}">JOB ${escapeHtml(job)} - JOTLIST</td>
<td align="right" style="${monoSmall}">BY EUKRON TEAM</td>
</tr></table></td></tr>
${bandRow}
<tr><td class="px" style="${cell("padding:40px 24px 40px 24px")}">${content}</td></tr>
<tr><td class="px" style="${cell(`padding:20px 24px;${rowBorder("top")}`)}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" style="${monoSmall}">COLOPHON - JOTLIST BY EUKRON TEAM<br>PRINTED IN THREE INKS.</td>
<td align="right" valign="middle">${swatches()}</td>
</tr></table></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
