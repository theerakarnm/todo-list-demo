type ErrorLogLine = {
  level: "warn" | "error";
  requestId: string;
  code: string;
  path: string;
  method: string;
  status: number;
};

/**
 * One JSON line per error for Workers Logs.
 * Never put personal data here: no emails, task text or query strings.
 */
export function logError(line: ErrorLogLine) {
  const output = line.level === "error" ? console.error : console.warn;
  output(JSON.stringify(line));
}
