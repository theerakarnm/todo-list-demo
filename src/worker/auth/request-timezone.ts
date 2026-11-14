import { timezoneSchema } from "../../shared/schemas/settings";

const TIMEZONE_HEADER = "x-timezone";
const TIMEZONE_PARAM = "timezone";

/**
 * The browser's time zone, sent by the client as an `x-timezone` header at sign-up.
 * The verification link carries it as `?timezone=` because that click is the first sign-in.
 * An unknown time zone counts as none.
 */
export function requestTimezone(request: Request) {
  const sent = request.headers.get(TIMEZONE_HEADER) ?? new URL(request.url).searchParams.get(TIMEZONE_PARAM);
  const parsed = timezoneSchema.safeParse(sent);
  return parsed.success ? parsed.data : undefined;
}

/** Adds the request's time zone to a link that will be opened in the same browser. */
export function withTimezoneOf(request: Request, link: URL) {
  const timezone = requestTimezone(request);
  if (timezone) link.searchParams.set(TIMEZONE_PARAM, timezone);
  return link;
}
