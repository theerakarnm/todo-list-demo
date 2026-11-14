import { generateKeyBetween } from "fractional-indexing";

// Manual order (Inbox, projects, subtasks) is a fractional-index string per row,
// so a move writes only the moved row (ARCHITECTURE §4).

type Positioned = { position: string };

/** A position after the last of `sortedRows`, i.e. at the end of the list. */
export function positionAtEnd(sortedRows: Positioned[]) {
  return generateKeyBetween(sortedRows.at(-1)?.position ?? null, null);
}

/** The new position of the row at `fromIndex` once it sits at `toIndex` (indexes into `sortedRows`). */
export function positionForMove(sortedRows: Positioned[], fromIndex: number, toIndex: number) {
  const moved = sortedRows[fromIndex];
  if (!moved) throw new Error(`No row at index ${fromIndex}`);
  if (fromIndex === toIndex) return moved.position;

  const others = sortedRows.filter((_, index) => index !== fromIndex);
  const before = others[toIndex - 1]?.position ?? null;
  // Two rows can share a position (made on two devices at once); then go
  // after them both, to the next position that is really larger.
  const after = others.slice(toIndex).find((row) => before === null || row.position > before)?.position ?? null;
  return generateKeyBetween(before, after);
}
