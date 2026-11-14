import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";

type DragHandleProps = {
  name: string;
  handleRef: Ref<HTMLButtonElement>;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};

/** The dotted grip of the mockups: drag it with a pointer, or focus it and press Space. */
export function DragHandle({ name, handleRef, attributes, listeners }: DragHandleProps) {
  const { t } = useTranslation();
  return (
    <button
      ref={handleRef}
      type="button"
      className="drag-handle"
      {...attributes}
      {...listeners}
      aria-label={t("dnd.handle", { name })}
    >
      <span className="drag-grip" aria-hidden="true" />
    </button>
  );
}
