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

  describe("without RESEND_API_KEY", () => {
    it("logs the link instead of sending", async () => {
      const fetchMock = stubFetch(new Response());
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await sendEmail({ RESEND_API_KEY: "", EMAIL_FROM: undefined }, verificationEmail);

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

      await sendEmail({ RESEND_API_KEY: undefined, EMAIL_FROM: undefined }, verificationEmail);

      const line = String(log.mock.calls[0]?.[0]);
      expect(line).not.toContain(verificationEmail.to);
      expect(line).not.toContain("secret body");
    });
  });

  describe("with RESEND_API_KEY", () => {
    const resendEnv = { RESEND_API_KEY: "test-key", EMAIL_FROM: "no-reply@mail.eukron.com" };

    it("posts the email to Resend from EMAIL_FROM", async () => {
      const fetchMock = stubFetch(Response.json({ id: "email_1" }));

      await sendEmail(resendEnv, verificationEmail);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0]!;
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

      await expect(sendEmail({ RESEND_API_KEY: "test-key", EMAIL_FROM: "" }, verificationEmail)).rejects.toThrow(
        "EMAIL_FROM",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
