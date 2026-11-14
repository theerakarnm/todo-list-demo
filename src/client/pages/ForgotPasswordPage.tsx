import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { requestPasswordReset } from "../auth/auth-api";
import { AuthLayout } from "../auth/AuthLayout";
import { AuthNotice } from "../auth/AuthNotice";
import { errorMessage } from "../auth/error-message";
import { EmailField } from "../auth/fields";
import { FormError } from "../auth/FormError";
import { useTurnstile } from "../auth/use-turnstile";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const turnstile = useTurnstile();
  const requestReset = useMutation({
    mutationFn: ({ email, turnstileToken }: { email: string; turnstileToken: string }) =>
      requestPasswordReset(email, turnstileToken),
    onError: turnstile.reset,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstile.token) return;
    const email = String(new FormData(event.currentTarget).get("email"));
    requestReset.mutate({ email, turnstileToken: turnstile.token });
  }

  return (
    <AuthLayout
      eyebrow={t("auth.recoveryEyebrow")}
      title={t("pages.forgotPassword.title")}
      subtitle={requestReset.isSuccess ? undefined : t("auth.forgotPassword.subtitle")}
    >
      {requestReset.isSuccess ? (
        <AuthNotice
          title={t("auth.forgotPassword.sentTitle")}
          body={t("auth.forgotPassword.sentBody", { email: requestReset.variables.email })}
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <EmailField id="email" label={t("auth.emailLabel")} />
          <div ref={turnstile.containerRef} className="mt-6 min-h-[65px]" />
          {requestReset.isError && <FormError>{errorMessage(requestReset.error, t)}</FormError>}
          <button
            type="submit"
            className="btn btn-lg mt-[26px] w-full"
            disabled={!turnstile.token || requestReset.isPending}
          >
            {t("auth.forgotPassword.submit")}
          </button>
        </form>
      )}
      <p className="mt-[26px] mb-0 text-center text-[15px]">
        <Link to="/login" className="font-bold">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </AuthLayout>
  );
}
