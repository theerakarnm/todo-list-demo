import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ApiRequestError } from "../api/request-error";
import { resetPassword } from "../auth/auth-api";
import { AuthLayout } from "../auth/AuthLayout";
import { AuthNotice } from "../auth/AuthNotice";
import { errorMessage } from "../auth/error-message";
import { PasswordField } from "../auth/fields";
import { FormError } from "../auth/FormError";

/** Opened from the reset email: /reset-password?token=... */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const token = useSearchParams()[0].get("token");
  const reset = useMutation({
    mutationFn: (newPassword: string) => resetPassword(token ?? "", newPassword),
  });
  const linkExpired = reset.error instanceof ApiRequestError && reset.error.code === "INVALID_TOKEN";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset.mutate(String(new FormData(event.currentTarget).get("password")));
  }

  return (
    <AuthLayout
      eyebrow={t("auth.recoveryEyebrow")}
      title={t("pages.resetPassword.title")}
      subtitle={t("auth.resetPassword.subtitle")}
    >
      {reset.isSuccess && (
        <AuthNotice title={t("auth.resetPassword.doneTitle")} body={t("auth.resetPassword.doneBody")}>
          <Link to="/login" className="btn btn-lg mt-6 w-full">
            {t("auth.resetPassword.logIn")}
          </Link>
        </AuthNotice>
      )}
      {!token && <FormError>{t("auth.resetPassword.invalidLink")}</FormError>}
      {token && !reset.isSuccess && (
        <form onSubmit={handleSubmit}>
          <PasswordField
            id="password"
            label={t("auth.resetPassword.newPasswordLabel")}
            autoComplete="new-password"
            describedBy="password-hint"
          >
            <p id="password-hint" className="mono muted mt-2 mb-0 text-[11px]">
              {t("auth.passwordHint")}
            </p>
          </PasswordField>
          {reset.isError && <FormError>{errorMessage(reset.error, t)}</FormError>}
          <button type="submit" className="btn btn-lg mt-[26px] w-full" disabled={reset.isPending}>
            {t("auth.resetPassword.submit")}
          </button>
        </form>
      )}
      {(!token || linkExpired) && (
        <p className="mt-[26px] mb-0 text-center text-[15px]">
          <Link to="/forgot-password" className="font-bold">
            {t("auth.resetPassword.requestNewLink")}
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
