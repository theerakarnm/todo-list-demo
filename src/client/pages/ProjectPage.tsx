import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";

export default function ProjectPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader eyebrow={t("pages.project.eyebrow")} title={t("pages.project.title")} />
    </AppPage>
  );
}
