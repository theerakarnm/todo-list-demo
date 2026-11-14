import { useTranslation } from "react-i18next";
import { useMe } from "../auth/use-me";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";
import { AccountSettings } from "../settings/AccountSettings";
import { SettingsTabs } from "../settings/SettingsTabs";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: me } = useMe();

  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.settings.eyebrow")}
        title={t("pages.settings.title")}
        subtitle={t("pages.settings.subtitle")}
      />
      {me && <SettingsTabs panels={{ account: <AccountSettings me={me} />, general: <ThemeSwitcher /> }} />}
    </AppPage>
  );
}
