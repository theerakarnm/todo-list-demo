import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import th from "../i18n/th.json";
import { answer, answerLater, apiError, lastJsonSentTo, requestsTo, testMe } from "../test/fake-api";
import { openPage } from "../test/render-app";

const t = th.notifications;
const PUBLIC_KEY = "BNuNFWFtkL1UWRGtGpfZxskSqWn4qYEQepegdeQATWVt-zSoxOL_iDvoP-lgaOj5a21CGwTQeU5FAsi7HUGDhWM";
const ENDPOINT = "https://push.example/send/abc";
const KEYS = { p256dh: `B${"a".repeat(86)}`, auth: "b".repeat(22) };

/** A browser with Notification, PushManager and a service worker, all faked. */
function fakeBrowser({ permission = "default", asked = "granted", subscribed = false } = {}) {
  let subscription: object | null = subscribed ? makeSubscription() : null;
  function makeSubscription() {
    return {
      endpoint: ENDPOINT,
      toJSON: () => ({ endpoint: ENDPOINT, keys: KEYS }),
      unsubscribe: vi.fn(async () => {
        subscription = null;
        return true;
      }),
    };
  }
  const pushManager = {
    getSubscription: vi.fn(async () => subscription),
    subscribe: vi.fn(async (_options: { userVisibleOnly: boolean; applicationServerKey: Uint8Array }) => (subscription = makeSubscription())),
  };
  const registration = { pushManager };
  const notification = {
    permission,
    requestPermission: vi.fn(async () => {
      notification.permission = asked;
      return asked;
    }),
  };
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("PushManager", class {});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => registration, ready: Promise.resolve(registration) },
  });
  return { pushManager, notification, getSubscription: () => subscription };
}

const browserSwitch = () => screen.getByRole<HTMLInputElement>("checkbox", { name: t.browserLabel });
const digestSwitch = () => screen.getByRole<HTMLInputElement>("checkbox", { name: t.digestLabel });

beforeEach(() => {
  answer("GET /api/push/public-key", { publicKey: PUBLIC_KEY });
  answer("POST /api/push/subscribe", new Response(null, { status: 204 }));
  answer("DELETE /api/push/subscribe", new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "serviceWorker");
  localStorage.clear();
});

describe("Settings → Notifications: browser notifications", () => {
  it("shows the tab with the mockup texts", async () => {
    fakeBrowser();

    await openPage("/app/settings?tab=notifications");

    expect(screen.getByRole("tab", { name: th.settingsTabs.notifications }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(t.browserHint)).toBeTruthy();
    expect(browserSwitch().checked).toBe(false);
  });

  it("is on when this device already has a subscription", async () => {
    fakeBrowser({ permission: "granted", subscribed: true });

    await openPage("/app/settings?tab=notifications");

    await waitFor(() => expect(browserSwitch().checked).toBe(true));
  });

  it("asks permission, subscribes with the server's public key and registers the device", async () => {
    const browser = fakeBrowser();
    await openPage("/app/settings?tab=notifications");

    act(() => browserSwitch().click());

    expect(await lastJsonSentTo("POST /api/push/subscribe")).toEqual({ endpoint: ENDPOINT, keys: KEYS });
    expect(browser.notification.requestPermission).toHaveBeenCalledOnce();
    const options = browser.pushManager.subscribe.mock.calls[0]?.[0];
    expect(options?.userVisibleOnly).toBe(true);
    expect(options?.applicationServerKey).toHaveLength(65);
    await waitFor(() => expect(browserSwitch().checked).toBe(true));
  });

  it("does not ask again when permission was already granted", async () => {
    const browser = fakeBrowser({ permission: "granted" });
    await openPage("/app/settings?tab=notifications");

    act(() => browserSwitch().click());

    await lastJsonSentTo("POST /api/push/subscribe");
    expect(browser.notification.requestPermission).not.toHaveBeenCalled();
  });

  it("stays off and explains when the user denies permission", async () => {
    const browser = fakeBrowser({ asked: "denied" });
    await openPage("/app/settings?tab=notifications");

    act(() => browserSwitch().click());

    expect(await screen.findByText(t.denied)).toBeTruthy();
    expect(browserSwitch().checked).toBe(false);
    expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
    expect(requestsTo("POST /api/push/subscribe")).toHaveLength(0);
  });

  it("rolls back with a Thai toast and drops the browser subscription when the server refuses", async () => {
    const browser = fakeBrowser();
    answer("POST /api/push/subscribe", apiError(500, "INTERNAL_ERROR"));
    await openPage("/app/settings?tab=notifications");

    act(() => browserSwitch().click());

    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes(t.enableFailed))).toBe(true);
    expect(browserSwitch().checked).toBe(false);
    expect(browser.getSubscription()).toBeNull();
  });

  it("removes this device's subscription when turned off", async () => {
    const browser = fakeBrowser({ permission: "granted", subscribed: true });
    await openPage("/app/settings?tab=notifications");
    await waitFor(() => expect(browserSwitch().checked).toBe(true));

    act(() => browserSwitch().click());

    expect(await lastJsonSentTo("DELETE /api/push/subscribe")).toEqual({ endpoint: ENDPOINT });
    await waitFor(() => expect(browser.getSubscription()).toBeNull());
    expect(browserSwitch().checked).toBe(false);
  });

  it("stays on with a Thai toast when removing fails", async () => {
    fakeBrowser({ permission: "granted", subscribed: true });
    answer("DELETE /api/push/subscribe", apiError(500, "INTERNAL_ERROR"));
    await openPage("/app/settings?tab=notifications");
    await waitFor(() => expect(browserSwitch().checked).toBe(true));

    act(() => browserSwitch().click());

    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes(t.disableFailed))).toBe(true);
    expect(browserSwitch().checked).toBe(true);
  });

  it("is disabled with the home screen explanation on an iPhone in Safari", async () => {
    fakeBrowser();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
    );

    await openPage("/app/settings?tab=notifications");

    expect(browserSwitch().disabled).toBe(true);
    expect(screen.getByText(t.needsHomeScreen)).toBeTruthy();
  });

  it("is disabled with an explanation in a browser without PushManager", async () => {
    fakeBrowser();
    Reflect.deleteProperty(window, "PushManager");

    await openPage("/app/settings?tab=notifications");

    expect(browserSwitch().disabled).toBe(true);
    expect(screen.getByText(t.unsupported)).toBeTruthy();
  });
});

describe("Settings → Notifications: daily digest", () => {
  it("shows the saved digest settings", async () => {
    fakeBrowser();
    answer("GET /api/me", testMe({ settings: { digestEnabled: true, digestTime: "07:30" } }));

    await openPage("/app/settings?tab=notifications");

    expect(digestSwitch().checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>(t.digestTimeLabel).value).toBe("07:30");
  });

  it("is off by default and saves when turned on", async () => {
    fakeBrowser();
    answer("PATCH /api/settings", { settings: testMe({ settings: { digestEnabled: true } }).settings });
    await openPage("/app/settings?tab=notifications");
    expect(digestSwitch().checked).toBe(false);

    act(() => digestSwitch().click());

    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ digestEnabled: true });
    await waitFor(() => expect(digestSwitch().checked).toBe(true));
  });

  it("saves a new time", async () => {
    fakeBrowser();
    answer("PATCH /api/settings", { settings: testMe({ settings: { digestTime: "06:45" } }).settings });
    await openPage("/app/settings?tab=notifications");

    fireEvent.change(screen.getByLabelText(t.digestTimeLabel), { target: { value: "06:45" } });

    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ digestTime: "06:45" });
  });

  it("goes back and shows a Thai toast when the server refuses", async () => {
    fakeBrowser();
    answer("PATCH /api/settings", apiError(429, "RATE_LIMITED"));
    await openPage("/app/settings?tab=notifications");

    act(() => digestSwitch().click());

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes(th.errors.api.RATE_LIMITED))).toBe(true);
    expect(digestSwitch().checked).toBe(false);
  });

  it("shows the new state while the save is still on its way", async () => {
    fakeBrowser();
    const save = answerLater("PATCH /api/settings");
    await openPage("/app/settings?tab=notifications");

    act(() => digestSwitch().click());

    await waitFor(() => expect(digestSwitch().checked).toBe(true));
    save.reply({ settings: testMe({ settings: { digestEnabled: true } }).settings });
  });
});
