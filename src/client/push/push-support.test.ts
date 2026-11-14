import { describe, expect, it } from "vitest";
import { type PushEnvironment, pushSupport } from "./push-support";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

const desktop: PushEnvironment = {
  userAgent: CHROME,
  maxTouchPoints: 0,
  installed: false,
  hasPushManager: true,
  hasNotification: true,
};

describe("pushSupport", () => {
  it("is ready in a desktop browser", () => {
    expect(pushSupport(desktop)).toBe("ready");
  });

  it("asks an iPhone in Safari to add JotList to the home screen first", () => {
    expect(pushSupport({ ...desktop, userAgent: IPHONE, hasPushManager: false })).toBe("needs-home-screen");
  });

  it("recognises an iPad that reports itself as a Mac", () => {
    expect(pushSupport({ ...desktop, userAgent: IPAD_AS_MAC, maxTouchPoints: 5, hasPushManager: false })).toBe(
      "needs-home-screen",
    );
  });

  it("is ready on an iPhone running the installed app", () => {
    expect(pushSupport({ ...desktop, userAgent: IPHONE, installed: true })).toBe("ready");
  });

  it("is unsupported in a browser without PushManager", () => {
    expect(pushSupport({ ...desktop, hasPushManager: false })).toBe("unsupported");
    expect(pushSupport({ ...desktop, hasNotification: false })).toBe("unsupported");
  });

  it("does not take a touch Mac-like desktop for an iPad when there are no touch points", () => {
    expect(pushSupport({ ...desktop, userAgent: IPAD_AS_MAC, hasPushManager: false })).toBe("unsupported");
  });
});
