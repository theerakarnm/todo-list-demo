import { useTranslation } from "react-i18next";

/** After sign-up: the account is waiting for the link in the verification email. */
export function CheckEmail({ email }: { email: string }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="check-email-title" className="mt-6 border-t-2 border-rule pt-6">
      <h2 id="check-email-title" className="mt-0 mb-3 text-2xl font-extrabold">
        {t("auth.signup.checkEmailTitle")}
      </h2>
      <p className="mt-0 mb-2 text-base leading-[1.6]">{t("auth.signup.checkEmailBody", { email })}</p>
      <p className="muted m-0 text-sm">{t("auth.signup.checkEmailHint")}</p>
    </section>
  );
}
