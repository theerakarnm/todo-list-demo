import { useTranslation } from "react-i18next";
import { Link } from "react-router";

/**
 * "jotlist" logo with the blue and orange print offset from the Login mockup.
 * `onDark` is the footer version: paper ink on night stock, a bit larger,
 * without blending (multiply would hide the offset on a dark background).
 */
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  const { t } = useTranslation();
  const word = t("app.wordmark");
  const offsetLayer = onDark ? "absolute" : "absolute mix-blend-multiply dark:mix-blend-screen";

  return (
    <Link
      to="/"
      className={`display relative inline-block leading-[1.1] no-underline ${onDark ? "text-[40px] text-paper hover:text-paper" : "text-[34px] text-fg"}`}
    >
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
