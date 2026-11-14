import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { PageHeader } from "../components/PageHeader";

export default function InboxPage() {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader eyebrow={t("pages.inbox.eyebrow")} title={t("pages.inbox.title")} />
    </AppPage>
  );
}
