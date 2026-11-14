import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";

export default function UpcomingPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader eyebrow={t("pages.upcoming.eyebrow")} title={t("pages.upcoming.title")} />
    </AppPage>
  );
}
