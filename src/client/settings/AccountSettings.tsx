import { useTranslation } from "react-i18next";
import type { Me } from "../auth/use-me";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccount } from "./DeleteAccount";
import { DisplayNameForm } from "./DisplayNameForm";

/** Settings → Account: name, read-only email, password and delete account. Photo upload comes with lane 3. */
export function AccountSettings({ me }: { me: Me }) {
  const { t } = useTranslation();

  return (
    <>
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
