import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./send-email";

const verificationEmail = {
  to: "somchai@example.com",
  subject: "ยืนยันอีเมลของคุณ",
  html: "<p>secret body</p>",
  text: "secret body",
  link: "https://jotlist.eukron.com/verify?token=abc",
};

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never sees a real Resend key in tests (vitest.config.ts blanks it)", () => {
    expect(env.RESEND_API_KEY).toBe("");
  });

  it("runs as development in tests (vitest.config.ts pins APP_ENV)", () => {
    expect(env.APP_ENV).toBe("development");
  });

  describe("without RESEND_API_KEY in development", () => {
    const devEnv = { RESEND_API_KEY: "", EMAIL_FROM: undefined, APP_ENV: "development" };

    it("logs the link instead of sending", async () => {
      const fetchMock = stubFetch(new Response());
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await sendEmail(devEnv, verificationEmail);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledOnce();
      expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
        level: "info",
        event: "email.mock",
        subject: verificationEmail.subject,
        link: verificationEmail.link,
      });
    });

    it("keeps the address and body out of the log", async () => {
      stubFetch(new Response());
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await sendEmail({ ...devEnv, RESEND_API_KEY: undefined }, verificationEmail);

      const line = String(log.mock.calls[0]?.[0]);
      expect(line).not.toContain(verificationEmail.to);
      expect(line).not.toContain("secret body");
    });
  });

  describe("without RESEND_API_KEY in production", () => {
    const productionEnv = { RESEND_API_KEY: undefined, EMAIL_FROM: undefined, APP_ENV: "production" };

    it("sends nothing and warns with the subject only", async () => {
      const fetchMock = stubFetch(new Response());
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await sendEmail(productionEnv, verificationEmail);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledOnce();
      expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({
        level: "warn",
        event: "email.skipped",
        subject: verificationEmail.subject,
      });
    });

    it("never logs the link, its token, the address or the body", async () => {
      stubFetch(new Response());
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await sendEmail(productionEnv, verificationEmail);

      expect(log).not.toHaveBeenCalled();
      const line = String(warn.mock.calls[0]?.[0]);
      for (const secret of [verificationEmail.link, "token=abc", verificationEmail.to, "secret body"]) {
        expect(line).not.toContain(secret);
      }
    });
  });

  describe("with RESEND_API_KEY", () => {
    const resendEnv = { RESEND_API_KEY: "test-key", EMAIL_FROM: "no-reply@mail.eukron.com", APP_ENV: "production" };

    it("posts the email to Resend from EMAIL_FROM", async () => {
      const fetchMock = stubFetch(Response.json({ id: "email_1" }));

      await sendEmail(resendEnv, verificationEmail);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe("https://api.resend.com/emails");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-key");
      expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
      expect(JSON.parse(String(init?.body))).toEqual({
        from: "no-reply@mail.eukron.com",
        to: verificationEmail.to,
        subject: verificationEmail.subject,
        html: verificationEmail.html,
        text: verificationEmail.text,
      });
    });

    it("throws when Resend rejects the email", async () => {
      stubFetch(Response.json({ name: "validation_error" }, { status: 422 }));

      await expect(sendEmail(resendEnv, verificationEmail)).rejects.toThrow("422");
    });

    it("refuses to send without EMAIL_FROM", async () => {
      const fetchMock = stubFetch(Response.json({ id: "email_1" }));

      await expect(sendEmail({ ...resendEnv, EMAIL_FROM: "" }, verificationEmail)).rejects.toThrow(
        "EMAIL_FROM",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
