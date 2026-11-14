export const LIMITS = {
  activeTasksPerUser: 1000,
  projectsPerUser: 100,
  subtasksPerTask: 50,
  taskTitleLength: 500,
  taskNotesLength: 10_000,
  subtaskTitleLength: 500,
  projectNameLength: 50,
  displayNameLength: 50,
  passwordMinLength: 8,
  positionLength: 128,
  logbookPageSize: 50,
  searchResults: 50,
  attachmentBytes: 5 * 1024 * 1024,
  attachmentsPerTask: 10,
  storageBytesPerUser: 200 * 1024 * 1024,
} as const;

export const PRIORITIES = ["none", "low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_BADGES: Record<Priority, string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
  none: "P4",
};

export const PROJECT_COLORS = ["blue", "orange", "violet", "green", "black"] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

// Same values as the --ink-* / --stock-* tokens in docs/design.
export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  blue: "#0078bf",
  orange: "#ff6c2f",
  violet: "#7c3aed",
  green: "#003223",
  black: "#1a1a1a",
};

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const START_PAGES = ["today", "inbox"] as const;
export type StartPage = (typeof START_PAGES)[number];

export const WEEK_STARTS = ["sun", "mon"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];
