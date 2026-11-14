import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";

export default function LogbookPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader eyebrow={t("pages.completed.eyebrow")} title={t("pages.completed.title")} />
    </AppPage>
  );
}
