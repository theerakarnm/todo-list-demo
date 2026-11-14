export type PushEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  /** Running as an installed app: display-mode standalone, or navigator.standalone on iOS. */
  installed: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
};

export type PushSupport = "ready" | "needs-home-screen" | "unsupported";

/** iPadOS 13+ Safari reports a Mac user agent, so a touch screen tells it apart. */
function isIos({ userAgent, maxTouchPoints }: PushEnvironment) {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Can this device get push? On iOS 16.4+ only an app added to the home screen can. */
export function pushSupport(environment: PushEnvironment): PushSupport {
  if (isIos(environment) && !environment.installed) return "needs-home-screen";
  return environment.hasPushManager && environment.hasNotification ? "ready" : "unsupported";
}

export function currentPushEnvironment(): PushEnvironment {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    installed:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
  };
}
