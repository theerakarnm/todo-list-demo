const RESEND_EMAILS_URL = "https://api.resend.com/emails";

type EmailEnv = Pick<Env, "RESEND_API_KEY" | "EMAIL_FROM">;

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** The verify / reset link inside the email. Logged in dev so you can click it. */
  link?: string;
};

/**
 * Sends an auth email through Resend.
 * Without RESEND_API_KEY (local dev, tests, CI) nothing is sent: one log line
 * with the subject and link is written instead. Logs never contain the
 * recipient, the body or the key.
 */
export async function sendEmail(env: EmailEnv, email: Email) {
  if (!env.RESEND_API_KEY) {
    console.log(JSON.stringify({ level: "info", event: "email.mock", subject: email.subject, link: email.link }));
    return;
  }
  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not set: add it to .dev.vars locally or as a Worker secret");
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend did not accept the email: HTTP ${response.status}`);
  }
}
