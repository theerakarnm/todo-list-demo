import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Me } from "../auth/use-me";
import { Avatar } from "../components/Avatar";
import { useChangeAvatar, useRemoveAvatar } from "./avatar-mutations";

/** "รูปโปรไฟล์ / photo" from the Settings mockup: the photo, เปลี่ยนรูป and ลบรูป. */
export function ProfilePhoto({ me }: { me: Me }) {
  const { t } = useTranslation();
  const changeAvatar = useChangeAvatar();
  const removeAvatar = useRemoveAvatar();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="form-field mb-6">
      <div className="mono">{t("settingsAccount.photoLabel")}</div>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar me={me} size="large" alt={t("settingsAccount.photoAlt")} />
        <button type="button" className="btn btn-outline btn-small" onClick={() => fileInput.current?.click()}>
          {t("settingsAccount.changePhoto")}
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/*,.heic,.heif"
          aria-label={t("settingsAccount.changePhoto")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) changeAvatar(file);
            event.target.value = "";
          }}
        />
        {/* Only an uploaded photo can be removed; the LINE picture belongs to LINE. */}
        {me.settings.avatarKey && (
          <button type="button" className="btn btn-outline btn-small border-transparent" onClick={removeAvatar}>
            {t("settingsAccount.removePhoto")}
          </button>
        )}
      </div>
    </div>
  );
}
