import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { apiErrorMessage } from "../api/error-message";
import { FormError } from "../auth/FormError";
import { useUpdateSettings } from "./use-update-settings";

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const { t } = useTranslation();
  const updateSettings = useUpdateSettings();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("displayName")).trim();
    updateSettings.mutate({ displayName: name });
  }

  return (
    <form className="form-field mb-6" onSubmit={handleSubmit}>
      <label className="mono" htmlFor="display-name">
        {t("settingsAccount.nameLabel")}
      </label>
      <div className="flex gap-2.5">
        <input
          id="display-name"
          name="displayName"
          className="input"
          autoComplete="nickname"
          required
          maxLength={LIMITS.displayNameLength}
          defaultValue={displayName}
        />
        <button type="submit" className="btn btn-outline flex-none">
          {t("settingsAccount.save")}
        </button>
      </div>
      <p role="status" className="mono muted m-0 text-[11px] empty:hidden">
        {updateSettings.isSuccess && t("settingsAccount.saved")}
      </p>
      {updateSettings.isError && <FormError>{apiErrorMessage(t, updateSettings.error)}</FormError>}
    </form>
  );
}
