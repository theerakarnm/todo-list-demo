import { useTranslation } from "react-i18next";
import { PublicPlaceholder } from "../components/PublicPlaceholder";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return <PublicPlaceholder title={t("pages.forgotPassword.title")} />;
}
