import { app, notifications } from "../i18n/th.json";

/** The JSON the server sends with every push (src/worker/push, cron reminders and digests). */
export type PushMessage = { title: string; body: string; url: string; tag: string | undefined };

const START_URL = "/today";

/** Only a path inside this app is opened from a notification; anything else goes to Today. */
export function safeAppPath(url: unknown): string {
  if (typeof url !== "string" || !/^\/(?![/\\])/.test(url)) return START_URL;
  return url;
}

function messageFromJson(data: unknown): PushMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const { title, body, url, tag } = data as Record<string, unknown>;
  if (typeof title !== "string" || title === "") return null;
  return {
    title,
    body: typeof body === "string" ? body : "",
    url: safeAppPath(url),
    tag: typeof tag === "string" ? tag : undefined,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The notification for a push's data, read as text. Data that is missing, not
 * JSON or not a message still shows a generic notification: a push that shows
 * nothing makes Chrome show its own notice and lets Safari drop the subscription.
 */
export function readPushMessage(text: string | undefined): PushMessage {
  const message = text ? messageFromJson(parseJson(text)) : null;
  return message ?? { title: app.name, body: notifications.genericBody, url: START_URL, tag: undefined };
}

/** An open tab of the signed-in app (under /app), to reuse instead of opening a new window. */
export function pickClientToFocus<Client extends { url: string }>(clients: readonly Client[], origin: string) {
  return clients.find((client) => client.url.startsWith(`${origin}/app`));
}
