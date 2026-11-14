import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PublicPlaceholder } from "../components/PublicPlaceholder";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <PublicPlaceholder title={t("pages.notFound.title")}>
      <Link to="/" className="btn btn-outline mt-7">
        {t("pages.notFound.backHome")}
      </Link>
    </PublicPlaceholder>
  );
}
