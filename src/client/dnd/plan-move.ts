import { positionForMove } from "../data/positions";

type Positioned = { id: string; position: string };

/**
 * A drop in a list sorted by position: the dragged row and its new position,
 * or null when nothing moves (dropped on itself or outside the list).
 */
export function planMove<Row extends Positioned>(sortedRows: Row[], activeId: string, overId: string | undefined) {
  const fromIndex = sortedRows.findIndex((row) => row.id === activeId);
  const toIndex = sortedRows.findIndex((row) => row.id === overId);
  const row = sortedRows[fromIndex];
  if (!row || toIndex < 0 || fromIndex === toIndex) return null;
  return { row, position: positionForMove(sortedRows, fromIndex, toIndex) };
}
