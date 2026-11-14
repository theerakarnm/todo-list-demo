import { useTranslation } from "react-i18next";
import { PublicPlaceholder } from "../components/PublicPlaceholder";

export default function OnboardingNamePage() {
  const { t } = useTranslation();
  return <PublicPlaceholder title={t("pages.onboardingName.title")} />;
}
