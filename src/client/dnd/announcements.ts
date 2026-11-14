import type { Active, Announcements, Over } from "@dnd-kit/core";
import type { TFunction } from "i18next";

/**
 * What a screen reader hears during a drag, in Thai from th.json.
 * `nameOf` names the dragged row; `targetOf` describes where it is over.
 */
export function dragAnnouncements(
  t: TFunction,
  nameOf: (active: Active) => string,
  targetOf: (over: Over) => string,
): Announcements {
  return {
    onDragStart: ({ active }) => t("dnd.picked", { name: nameOf(active) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dnd.over", { name: nameOf(active), target: targetOf(over) })
        : t("dnd.notOver", { name: nameOf(active) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("dnd.dropped", { name: nameOf(active), target: targetOf(over) })
        : t("dnd.droppedNowhere", { name: nameOf(active) }),
    onDragCancel: ({ active }) => t("dnd.cancelled", { name: nameOf(active) }),
  };
}
