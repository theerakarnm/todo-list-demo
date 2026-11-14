/** The JSON the server sends with every push (src/worker/push, cron reminders and digests). */
export type PushMessage = { title: string; body: string; url: string; tag: string | undefined };

const START_URL = "/today";

/** Only a path inside this app is opened from a notification; anything else goes to Today. */
export function safeAppPath(url: unknown): string {
  if (typeof url !== "string" || !/^\/(?![/\\])/.test(url)) return START_URL;
  return url;
}

export function parsePushMessage(data: unknown): PushMessage | null {
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

/** An open tab of the signed-in app (under /app), to reuse instead of opening a new window. */
export function pickClientToFocus<Client extends { url: string }>(clients: readonly Client[], origin: string) {
  return clients.find((client) => client.url.startsWith(`${origin}/app`));
}
