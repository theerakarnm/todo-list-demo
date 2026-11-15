import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { apiErrorMessage } from "../api/error-message";
import { ApiRequestError } from "../api/request-error";
import { signInWithEmail } from "../auth/auth-api";
import { AuthLayout, OrDivider } from "../auth/AuthLayout";
import { EmailField, PasswordField } from "../auth/fields";
import { FormError } from "../auth/FormError";
import { LineSignInButton } from "../auth/LineSignInButton";
import { safeNextPath } from "../auth/next-path";
import { meQuery } from "../auth/use-me";

export default function LoginPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const lineError = searchParams.get("error");

  const signIn = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signInWithEmail(email, password),
    // Once /api/me sees the session, the route guard moves on to ?next= or the start page.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQuery.queryKey }),
  });
  const wrongPassword = signIn.error instanceof ApiRequestError && signIn.error.code === "INVALID_CREDENTIALS";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    signIn.mutate({ email: String(form.get("email")), password: String(form.get("password")) });
  }

  return (
    <AuthLayout eyebrow={t("auth.login.eyebrow")} title={t("pages.login.title")} subtitle={t("auth.login.subtitle")}>
      <LineSignInButton next={safeNextPath(searchParams.get("next")) ?? "/app"} />
      {lineError && (
        <FormError>{lineError === "access_denied" ? t("auth.lineErrors.cancelled") : t("auth.lineErrors.failed")}</FormError>
      )}
      <OrDivider />
      <form onSubmit={handleSubmit}>
        <EmailField id="email" label={t("auth.emailLabel")} className="mb-5" />
        <PasswordField
          id="password"
          label={t("auth.passwordLabel")}
          autoComplete="current-password"
          invalid={wrongPassword}
          describedBy={signIn.isError ? "password-error" : undefined}
        >
          {signIn.isError && <FormError id="password-error">{apiErrorMessage(t, signIn.error)}</FormError>}
        </PasswordField>
        <div className="mt-2.5 text-right">
          <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm">
            {t("auth.login.forgotPassword")}
          </Link>
        </div>
        <button type="submit" className="btn btn-lg mt-[26px] w-full" disabled={signIn.isPending}>
          {t("auth.login.submit")}
        </button>
      </form>
      <p className="mt-[26px] mb-0 text-center text-[15px]">
        {t("auth.login.noAccount")}{" "}
        <Link to="/signup" className="font-bold">
          {t("auth.login.signUp")}
        </Link>
      </p>
    </AuthLayout>
  );
}
