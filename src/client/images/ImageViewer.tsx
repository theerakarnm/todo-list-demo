import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import type { Attachment } from "../data/types";
import { useImageSource } from "./use-image-source";

/** A sideways finger move longer than this (px) goes to the next or previous image. */
const SWIPE_DISTANCE = 50;

function ViewedImage({ attachment, number }: { attachment: Attachment; number: number }) {
  const { t } = useTranslation();
  const src = useImageSource(attachment);
  return (
    <img
      className="image-viewer-image"
      src={src}
      alt={t("images.image", { number })}
      draggable={false}
    />
  );
}

type ImageViewerProps = { images: Attachment[]; startIndex: number; onClose: () => void };

/**
 * One image at a time, full screen. ←/→, the side buttons or a swipe move;
 * Esc closes. A modal <dialog> like the drawer: focus stays inside and goes back
 * to the thumbnail on close.
 */
export function ImageViewer({ images, startIndex, onClose }: ImageViewerProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(startIndex);
  const swipeStart = useRef<number | null>(null);
  // An image deleted on another device meanwhile: stay within the list.
  const shown = Math.min(index, images.length - 1);
  const image = images[shown];

  const move = (step: number) => setIndex(Math.max(0, Math.min(images.length - 1, shown + step)));

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  }

  function onPointerUp(event: PointerEvent) {
    if (swipeStart.current === null) return;
    const distance = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) >= SWIPE_DISTANCE) move(distance < 0 ? 1 : -1);
  }

  // Rendered at the top of the page, so this dialog is not inside the drawer's.
  return createPortal(
    <Dialog label={t("images.viewer")} onClose={onClose} className="image-viewer" onKeyDown={onKeyDown}>
      <div className="image-viewer-bar">
        <span className="mono">{t("images.viewerCount", { number: shown + 1, total: images.length })}</span>
        <form method="dialog">
          <button type="submit" className="icon-button" aria-label={t("images.closeViewer")}>
            <Icon name="close" />
          </button>
        </form>
      </div>
      <div
        className="image-viewer-stage"
        onPointerDown={(event) => (swipeStart.current = event.clientX)}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        <button
          type="button"
          className="icon-button image-viewer-previous"
          aria-label={t("images.previous")}
          disabled={shown === 0}
          onClick={() => move(-1)}
        >
          <Icon name="chevronLeft" size={24} />
        </button>
        {image && <ViewedImage key={image.id} attachment={image} number={shown + 1} />}
        <button
          type="button"
          className="icon-button image-viewer-next"
          aria-label={t("images.next")}
          disabled={shown === images.length - 1}
          onClick={() => move(1)}
        >
          <Icon name="chevronRight" size={24} />
        </button>
      </div>
    </Dialog>,
    document.body,
  );
}
