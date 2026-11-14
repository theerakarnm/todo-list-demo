import { type ClipboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorCodeMessage } from "../api/error-message";
import { Icon } from "../components/Icon";
import { isImageFile } from "../images/prepare-image";
import { useToast } from "../toast/ToastProvider";

type PastedImage = { file: File; previewUrl: string };

/**
 * Images pasted into Quick Add, kept until the task is saved (they upload
 * right after it is created). Their previews are freed when removed or when Quick Add closes.
 */
export function usePastedImages() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [images, setImages] = useState<PastedImage[]>([]);
  const latest = useRef(images);
  latest.current = images;

  useEffect(() => () => {
    for (const image of latest.current) URL.revokeObjectURL(image.previewUrl);
  }, []);

  /** Takes the files of a paste; a paste of plain text is left to the field. */
  function onPaste(event: ClipboardEvent) {
    const files = [...event.clipboardData.files];
    if (files.length === 0) return;
    event.preventDefault();
    const pasted = files.filter(isImageFile);
    if (pasted.length < files.length) showToast({ tone: "error", message: errorCodeMessage(t, "UNSUPPORTED_FILE") });
    const added = pasted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...added]);
  }

  function remove(removed: PastedImage) {
    URL.revokeObjectURL(removed.previewUrl);
    setImages((current) => current.filter((image) => image !== removed));
  }

  return { images, files: images.map((image) => image.file), onPaste, remove };
}

type QuickAddImagesProps = { images: PastedImage[]; onRemove: (image: PastedImage) => void };

/** Small thumbnails of the pasted images, each with a button to take it out. */
export function QuickAddImages({ images, onRemove }: QuickAddImagesProps) {
  const { t } = useTranslation();
  if (images.length === 0) return null;

  return (
    <ul className="quick-add-images" aria-label={t("quickAdd.images")}>
      {images.map((image, index) => (
        <li key={image.previewUrl} className="quick-add-image">
          <img src={image.previewUrl} alt={t("quickAdd.image", { number: index + 1 })} />
          <button
            type="button"
            className="icon-button"
            aria-label={t("quickAdd.removeImage", { number: index + 1 })}
            onClick={() => onRemove(image)}
          >
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}
