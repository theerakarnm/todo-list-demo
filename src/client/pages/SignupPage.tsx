import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ApiRequestError } from "../api/request-error";
import { signUpWithEmail } from "../auth/auth-api";
import { AuthLayout, OrDivider } from "../auth/AuthLayout";
import { CheckEmail } from "../auth/CheckEmail";
import { errorMessage } from "../auth/error-message";
import { EmailField, PasswordField } from "../auth/fields";
import { FormError } from "../auth/FormError";
import { LineSignInButton, useLineSignIn } from "../auth/LineSignInButton";
import { useTurnstile } from "../auth/use-turnstile";

type SignUpInput = { email: string; password: string; turnstileToken: string };

export default function SignupPage() {
  const { t } = useTranslation();
  const turnstile = useTurnstile();
  const signUp = useMutation({
    mutationFn: ({ email, password, turnstileToken }: SignUpInput) => signUpWithEmail(email, password, turnstileToken),
    // A Turnstile token works once; a new attempt needs a new one.
    onError: turnstile.reset,
  });
  const errorCode = signUp.error instanceof ApiRequestError ? signUp.error.code : null;
  const emailTaken = errorCode === "EMAIL_TAKEN" || errorCode === "EMAIL_TAKEN_LINE";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstile.token) return;
    const form = new FormData(event.currentTarget);
    signUp.mutate({ email: String(form.get("email")), password: String(form.get("password")), turnstileToken: turnstile.token });
  }

  if (signUp.isSuccess) {
    return (
      <AuthLayout eyebrow={t("auth.signup.eyebrow")} title={t("pages.signup.title")}>
        <CheckEmail email={signUp.variables.email} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow={t("auth.signup.eyebrow")} title={t("pages.signup.title")} subtitle={t("auth.signup.subtitle")}>
      <LineSignInButton next="/app" />
      <OrDivider />
      <form onSubmit={handleSubmit}>
        <EmailField
          id="email"
          label={t("auth.emailLabel")}
          className="mb-5"
          invalid={emailTaken}
          describedBy={emailTaken ? "email-error" : undefined}
        >
          {errorCode === "EMAIL_TAKEN" && <EmailTakenError />}
          {errorCode === "EMAIL_TAKEN_LINE" && <EmailTakenByLineError />}
        </EmailField>
        <PasswordField
          id="password"
          label={t("auth.passwordLabel")}
          autoComplete="new-password"
          describedBy="password-hint"
        >
          <p id="password-hint" className="mono muted mt-2 mb-0 text-[11px]">
            {t("auth.passwordHint")}
          </p>
        </PasswordField>
        <div ref={turnstile.containerRef} className="mt-6 min-h-[65px]" />
        {signUp.isError && !emailTaken && <FormError>{errorMessage(signUp.error, t)}</FormError>}
        <button type="submit" className="btn btn-lg mt-[26px] w-full" disabled={!turnstile.token || signUp.isPending}>
          {t("auth.signup.submit")}
        </button>
      </form>
      <p className="mt-[26px] mb-0 text-center text-[15px]">
        {t("auth.signup.haveAccount")}{" "}
        <Link to="/login" className="font-bold">
          {t("auth.signup.logIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}

function EmailTakenError() {
  return (
    <FormError id="email-error">
      <Trans i18nKey="auth.signup.emailTaken" components={{ login: <Link to="/login" className="font-bold" /> }} />
    </FormError>
  );
}

/** The email belongs to a LINE account: sign in with LINE, or set a password through forgot password. */
function EmailTakenByLineError() {
  const lineSignIn = useLineSignIn("/app");

  return (
    <FormError id="email-error">
      <Trans
        i18nKey="auth.signup.emailTakenLine"
        components={{
          line: <button type="button" className="link-button" onClick={() => lineSignIn.mutate()} />,
          forgot: <Link to="/forgot-password" className="font-bold" />,
        }}
      />
    </FormError>
  );
}
