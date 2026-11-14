import { rectSortingStrategy } from "@dnd-kit/sortable";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { Icon } from "../components/Icon";
import { useMoveImage, useUploadImages } from "../data/attachment-mutations";
import { attachmentsOfTask } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { SortableArea } from "../dnd/SortableArea";
import { ImageTile } from "./ImageTile";

/** Also .heic: some systems give HEIC photos no image/ type, so image/* alone would hide them. */
const ACCEPTED_FILES = "image/*,.heic,.heif";

type ImageGalleryProps = {
  taskId: string;
  /** Files are being dragged over the drawer: show where they go. */
  dropping: boolean;
};

/** The task's images under the notes: thumbnails, and a button to add more. */
export function ImageGallery({ taskId, dropping }: ImageGalleryProps) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const uploadImages = useUploadImages();
  const moveImage = useMoveImage();
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments = store ? attachmentsOfTask(store, taskId) : [];

  return (
    <section className="flex flex-col">
      <h3 className="mono m-0 mb-2 font-semibold">
        {t("images.heading", { count: attachments.length, limit: LIMITS.attachmentsPerTask })}
      </h3>
      {attachments.length > 0 && (
        <SortableArea
          rows={attachments}
          nameOf={(attachment) => t("images.image", { number: attachments.indexOf(attachment) + 1 })}
          strategy={rectSortingStrategy}
          onMove={moveImage}
        >
          <ul className="image-grid">
            {attachments.map((attachment, index) => (
              <ImageTile key={attachment.id} attachment={attachment} number={index + 1} />
            ))}
          </ul>
        </SortableArea>
      )}
      {dropping ? (
        <div className="drop-hint mt-3">
          <span className="mono">{t("images.drop")}</span>
        </div>
      ) : (
        <button type="button" className="add-task mt-3" onClick={() => fileInput.current?.click()}>
          <Icon name="plus" size={16} />
          <span className="flex-1">{t("images.add")}</span>
          <span className="mono max-sm:hidden">{t("images.addHint")}</span>
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept={ACCEPTED_FILES}
        aria-label={t("images.add")}
        onChange={(event) => {
          uploadImages(taskId, [...(event.target.files ?? [])]);
          // The same file can be picked again later.
          event.target.value = "";
        }}
      />
    </section>
  );
}
