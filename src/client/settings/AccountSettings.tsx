import { useTranslation } from "react-i18next";
import type { Me } from "../auth/use-me";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccount } from "./DeleteAccount";
import { DisplayNameForm } from "./DisplayNameForm";
import { ProfilePhoto } from "./ProfilePhoto";

/** Settings → Account: profile photo, name, read-only email, password and delete account. */
export function AccountSettings({ me }: { me: Me }) {
  const { t } = useTranslation();

  return (
    <>
      <ProfilePhoto me={me} />
      <DisplayNameForm displayName={me.settings.displayName} />
      <div className="form-field mb-6">
        <label className="mono" htmlFor="account-email">
          {t("settingsAccount.emailLabel")}
        </label>
        <input
          id="account-email"
          className="input text-fg-muted"
          type="text"
          readOnly
          value={me.user.email ?? t("settingsAccount.noEmail")}
        />
      </div>
      {me.user.hasPassword && <ChangePasswordForm />}
      <DeleteAccount />
    </>
  );
}
