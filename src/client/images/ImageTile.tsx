import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalUpload } from "../data/local-uploads";
import type { Attachment } from "../data/types";
import { fileUrl } from "./file-url";

type ImageTileProps = { attachment: Attachment; number: number };

/** One square thumbnail. While it uploads, the local preview shows with its progress. */
export function ImageTile({ attachment, number }: ImageTileProps) {
  const { t } = useTranslation();
  const upload = useLocalUpload(attachment.id);
  const [broken, setBroken] = useState(false);
  const percent = upload && Math.round(upload.progress * 100);

  return (
    <li className="image-tile">
      {broken ? (
        <span className="image-broken mono">{t("images.noPreview")}</span>
      ) : (
        <img
          src={upload?.previewUrl ?? fileUrl(attachment.r2Key)}
          alt={t("images.image", { number })}
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
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
