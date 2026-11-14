// Search results show where the query was found (the orange marks in the Search mockup).

export type HighlightPart = { text: string; match: boolean };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `text` cut into pieces, with every case-insensitive occurrence of `query` marked. */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  // A capture group keeps the matches in the split result, at the odd indexes.
  return text
    .split(new RegExp(`(${escapeRegExp(needle)})`, "i"))
    .map((piece, index) => ({ text: piece, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

const SNIPPET_BEFORE = 20;
const SNIPPET_LENGTH = 50;

/** A short piece of `text` around the first match, for a task found by its notes. Null without a match. */
export function snippetAround(text: string, query: string) {
  const at = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (at < 0 || !query.trim()) return null;
  if (text.length <= SNIPPET_LENGTH) return text;
  const start = Math.max(0, at - SNIPPET_BEFORE);
  const end = Math.min(text.length, start + SNIPPET_LENGTH);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
