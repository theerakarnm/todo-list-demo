import {
  type CollisionDetection,
  closestCenter,
  defaultKeyboardCoordinateGetter,
  type KeyboardCoordinateGetter,
  pointerWithin,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { dragData } from "./drag-ids";

/**
 * Which target a drag is over. A project only lands on another project.
 * A task under the pointer of a sidebar project or an Upcoming day lands there;
 * otherwise it takes the place of the nearest task in its list (or the nearest day).
 */
export const collisionDetection: CollisionDetection = (args) => {
  const activeType = dragData(args.active.data.current)?.type;
  const ofType = (...types: string[]) =>
    args.droppableContainers.filter((container) => types.includes(dragData(container.data.current)?.type ?? ""));

  if (activeType === "project") return closestCenter({ ...args, droppableContainers: ofType("project") });

  const underPointer = pointerWithin({ ...args, droppableContainers: ofType("project", "day") });
  if (underPointer.length > 0) return underPointer;
  const isSortable = Boolean(args.active.data.current?.sortable);
  return closestCenter({ ...args, droppableContainers: ofType(isSortable ? "task" : "day") });
};

/**
 * Arrow keys for a keyboard drag: through the list for sortable rows; for an
 * Upcoming task (not sortable), straight to the previous or next day.
 */
export const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { active, over, collisionRect, droppableRects, droppableContainers } = args.context;
  if (active?.data.current?.sortable) return sortableKeyboardCoordinates(event, args);

  const days = droppableContainers
    .getEnabled()
    .filter((container) => dragData(container.data.current)?.type === "day")
    .flatMap((container) => {
      const rect = droppableRects.get(container.id);
      return rect ? [{ id: container.id, rect }] : [];
    })
    .sort((a, b) => a.rect.top - b.rect.top);
  const step = { ArrowDown: 1, ArrowUp: -1 }[event.code];
  if (days.length === 0 || !step || !collisionRect) return defaultKeyboardCoordinateGetter(event, args);

  event.preventDefault();
  const current = days.findIndex((day) => day.id === over?.id);
  const next = days[Math.min(Math.max(current + step, 0), days.length - 1)];
  if (!next) return undefined;
  // Centre the dragged row on that day, so it is the closest target.
  return {
    x: next.rect.left + (next.rect.width - collisionRect.width) / 2,
    y: next.rect.top + (next.rect.height - collisionRect.height) / 2,
  };
};
