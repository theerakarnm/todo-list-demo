import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { useDeleteImage } from "../data/attachment-mutations";
import { useLocalUpload } from "../data/local-uploads";
import type { Attachment } from "../data/types";
import { DragHandle } from "../dnd/DragHandle";
import { fileUrl } from "./file-url";

type ImageTileProps = { attachment: Attachment; number: number };

/** One square thumbnail. While it uploads, the local preview shows with its progress. */
export function ImageTile({ attachment, number }: ImageTileProps) {
  const { t } = useTranslation();
  const upload = useLocalUpload(attachment.id);
  const deleteImage = useDeleteImage();
  const [broken, setBroken] = useState(false);
  const sortable = useSortable({ id: attachment.id, attributes: { roleDescription: t("dnd.roleDescription") } });
  const percent = upload && Math.round(upload.progress * 100);
  const name = t("images.image", { number });

  return (
    <li
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className="image-tile"
      data-dragging={sortable.isDragging}
    >
      {broken ? (
        <span className="image-broken mono">{t("images.noPreview")}</span>
      ) : (
        <img
          src={upload?.previewUrl ?? fileUrl(attachment.r2Key)}
          alt={name}
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
      <DragHandle
        name={name}
        handleRef={sortable.setActivatorNodeRef}
        attributes={sortable.attributes}
        listeners={sortable.listeners}
      />
      <button
        type="button"
        className="icon-button image-delete"
        aria-label={t("images.delete", { number })}
        onClick={() => deleteImage(attachment)}
      >
        <Icon name="trash" size={16} />
      </button>
      {upload && (
        <span
          className="image-progress mono"
          role="progressbar"
          aria-label={t("images.uploading", { number })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="image-progress-bar" style={{ width: `${percent}%` }} />
          {percent}%
        </span>
      )}
    </li>
  );
}
