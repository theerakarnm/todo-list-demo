import { useTranslation } from "react-i18next";
import { PublicPlaceholder } from "../components/PublicPlaceholder";

export default function TermsPage() {
  const { t } = useTranslation();
  return <PublicPlaceholder title={t("pages.terms.title")} />;
}
