import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { startLineSignIn } from "./auth-api";
import { errorMessage } from "./error-message";
import { goToExternalPage } from "./external-page";
import { FormError } from "./FormError";

/** Sends the browser to LINE; after LINE the user comes back to `next`. */
export function useLineSignIn(next: string) {
  return useMutation({
    mutationFn: () => startLineSignIn(next),
    onSuccess: ({ url }) => goToExternalPage(url),
  });
}

/** "Continue with LINE" in LINE green (ARCHITECTURE §15). `className` sets its size. */
export function LineSignInButton({ next, className = "w-full min-h-14" }: { next: string; className?: string }) {
  const { t } = useTranslation();
  const lineSignIn = useLineSignIn(next);

  return (
    <>
      <button
        type="button"
        className={`btn btn-line ${className}`}
        disabled={lineSignIn.isPending}
        onClick={() => lineSignIn.mutate()}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
          <path
            fill="currentColor"
            d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5 1.1-.5 5.9-3.5 8-5.9 1.4-1.6 2-3.2 2-4.9 0-4.4-4.5-8-10-8Z"
          />
        </svg>
        {t("auth.continueWithLine")}
      </button>
      {lineSignIn.isError && <FormError>{errorMessage(lineSignIn.error, t)}</FormError>}
    </>
  );
}
