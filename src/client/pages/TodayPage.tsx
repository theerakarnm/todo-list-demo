import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";
import { formatShortThaiDate } from "../i18n/format-date";

export default function TodayPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.today.eyebrow", { date: formatShortThaiDate(new Date()) })}
        title={t("pages.today.title")}
      />
    </AppPage>
  );
}
