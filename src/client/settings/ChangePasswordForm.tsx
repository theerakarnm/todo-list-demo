import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "../api/request-error";
import { changePassword } from "../auth/auth-api";
import { errorMessage } from "../auth/error-message";
import { PasswordField } from "../auth/fields";
import { FormError } from "../auth/FormError";

/** "เปลี่ยนรหัสผ่าน" opens a small form: current password and new password. */
export function ChangePasswordForm() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const change = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    onSuccess: () => setOpen(false),
  });
  const wrongPassword = change.error instanceof ApiRequestError && change.error.code === "WRONG_PASSWORD";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change.mutate({ current: String(form.get("currentPassword")), next: String(form.get("newPassword")) });
  }

  return (
    <div className="form-field mb-6">
      <div className="mono">{t("settingsAccount.passwordLabel")}</div>
      {open ? (
        <form onSubmit={handleSubmit} className="border-[1.5px] border-rule p-4">
          <PasswordField
            id="current-password"
            name="currentPassword"
            label={t("settingsAccount.currentPassword")}
            autoComplete="current-password"
            invalid={wrongPassword}
            className="mb-5"
          />
          <PasswordField
            id="new-password"
            name="newPassword"
            label={t("settingsAccount.newPassword")}
            autoComplete="new-password"
            describedBy="new-password-hint"
          >
            <p id="new-password-hint" className="mono muted mt-0 mb-0 text-[11px]">
              {t("auth.passwordHint")}
            </p>
          </PasswordField>
          {change.isError && <FormError>{errorMessage(change.error, t)}</FormError>}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="submit" className="btn min-h-11 px-3.5 text-sm" disabled={change.isPending}>
              {t("settingsAccount.savePassword")}
            </button>
            <button type="button" className="btn btn-outline min-h-11 px-3.5 text-sm" onClick={() => setOpen(false)}>
              {t("settingsAccount.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="btn btn-outline min-h-11 px-3.5 text-sm"
            onClick={() => {
              change.reset();
              setOpen(true);
            }}
          >
            {t("settingsAccount.changePassword")}
          </button>
          <p role="status" className="mono muted m-0 text-[11px]">
            {change.isSuccess && t("settingsAccount.passwordChanged")}
          </p>
        </div>
      )}
    </div>
  );
}
