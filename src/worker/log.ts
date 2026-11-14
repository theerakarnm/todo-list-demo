type ErrorLogLine = {
  level: "warn" | "error";
  requestId: string;
  code: string;
  /** The matched route pattern, e.g. "/api/tasks/:id". Never the raw path: it can hold ids and tokens. */
  route: string;
  method: string;
  status: number;
};

/**
 * One JSON line per error for Workers Logs.
 * Never put personal data here: no emails, task text, raw paths or query strings.
 */
export function logError(line: ErrorLogLine) {
  const output = line.level === "error" ? console.error : console.warn;
  output(JSON.stringify(line));
}
