import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.settings.eyebrow")}
        title={t("pages.settings.title")}
        subtitle={t("pages.settings.subtitle")}
      />
    </AppPage>
  );
}
