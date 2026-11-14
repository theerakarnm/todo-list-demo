import { vi } from "vitest";

type FakeHandler = (request: Request) => Response | Promise<Response>;

export type SentEmail = { from: string; to: string; subject: string; html: string; text: string };

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The only Turnstile token the fake siteverify accepts. */
export const PASSING_TURNSTILE_TOKEN = "passing-turnstile-token";

/**
 * Replaces `fetch` with a fake internet for one test: each outside URL gets a
 * handler, and any other request fails the test. Nothing real is ever called.
 * Emails "sent" through Resend are kept in `sentEmails`.
 */
export function fakeInternet() {
  const handlers = new Map<string, FakeHandler>();
  const sentEmails: SentEmail[] = [];

  handlers.set(RESEND_EMAILS_URL, async (request) => {
    sentEmails.push(await request.json());
    return Response.json({ id: `email_${sentEmails.length}` });
  });

  handlers.set(TURNSTILE_SITEVERIFY_URL, async (request) => {
    const form = await request.formData();
    return Response.json({ success: form.get("response") === PASSING_TURNSTILE_TOKEN });
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = request.url.split("?")[0] ?? request.url;
      const handler = handlers.get(url);
      if (!handler) throw new Error(`Unexpected fetch in a test: ${url}`);
      return handler(request);
    }),
  );

  return {
    sentEmails,
    /** Answers every request to `url` with `handler`. */
    on(url: string, handler: FakeHandler) {
      handlers.set(url, handler);
    },
    /** The first link in the last email sent to `to`. */
    linkInLastEmailTo(to: string) {
      const email = sentEmails.findLast((sent) => sent.to === to);
      const link = email?.text.match(/https?:\/\/\S+/)?.[0];
      if (!link) throw new Error("No email with a link was sent to that address");
      return link;
    },
  };
}

export type FakeInternet = ReturnType<typeof fakeInternet>;
