import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { AuthLayout } from "../auth/AuthLayout";
import { AuthNotice } from "../auth/AuthNotice";

/**
 * Where the verification link lands. Better Auth has already verified the
 * email and signed the user in, or it sends `?error=` for an expired or used link.
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const failed = useSearchParams()[0].has("error");

  return (
    <AuthLayout eyebrow={t("auth.recoveryEyebrow")} title={t("pages.verifyEmail.title")}>
      {failed ? (
        <AuthNotice title={t("auth.verifyEmail.expiredTitle")} body={t("auth.verifyEmail.expiredBody")}>
          <Link to="/login" className="btn btn-lg mt-6 w-full">
            {t("auth.verifyEmail.logIn")}
          </Link>
        </AuthNotice>
      ) : (
        <AuthNotice title={t("auth.verifyEmail.doneTitle")} body={t("auth.verifyEmail.doneBody")}>
          {/* The app sends a new user to onboarding first. */}
          <Link to="/app" className="btn btn-lg mt-6 w-full">
            {t("auth.verifyEmail.continue")}
          </Link>
        </AuthNotice>
      )}
    </AuthLayout>
  );
}
