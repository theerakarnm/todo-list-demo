import { useTranslation } from "react-i18next";
import { Link } from "react-router";

/** "jotlist" logo with the blue and orange print offset from the Login mockup. */
export function Wordmark() {
  const { t } = useTranslation();
  const word = t("app.wordmark");
  const offsetLayer = "absolute mix-blend-multiply dark:mix-blend-screen";

  return (
    <Link to="/" className="display relative inline-block text-[34px] leading-[1.1] text-fg no-underline">
      <span aria-hidden="true" className={`${offsetLayer} -left-0.5 top-0.5 text-ink-blue`}>
        {word}
      </span>
      <span aria-hidden="true" className={`${offsetLayer} left-0.5 -top-0.5 text-ink-orange`}>
        {word}
      </span>
      <span className="relative">{word}</span>
    </Link>
  );
}
