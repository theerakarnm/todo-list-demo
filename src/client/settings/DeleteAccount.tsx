import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import { throwIfFailed } from "../api/request-error";
import { errorMessage } from "../auth/error-message";
import { FormError } from "../auth/FormError";
import { Dialog } from "../components/Dialog";

const TRASH_ICON = "M3 4.5 H13 M6 4.5 V2.5 H10 V4.5 M4.5 4.5 V14 H11.5 V4.5 M7 7 V11.5 M9 7 V11.5";

/** The dashed "ลบบัญชี" box. Deleting needs a second click in a confirm dialog. */
export function DeleteAccount() {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteAccount = useMutation({
    mutationFn: async () => throwIfFailed(await api.api.account.$delete()),
    onSuccess: async () => {
      // Leave the signed-in pages first, then forget everything cached for this user.
      await navigate("/", { replace: true });
      queryClient.clear();
    },
  });

  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-2 border-dashed border-rule p-[22px]">
      <div className="max-w-[380px]">
        <div className="mono font-semibold">{t("settingsAccount.deleteTitle")}</div>
        <p className="mt-2 mb-0 text-[15px] leading-[1.6]">{t("settingsAccount.deleteBody")}</p>
      </div>
      <DeleteButton label={t("settingsAccount.deleteButton")} onClick={() => setConfirming(true)} />

      {confirming && (
        <Dialog
          label={t("settingsAccount.deleteConfirmTitle")}
          onClose={() => setConfirming(false)}
          className="mx-auto mt-[20vh] w-[min(480px,calc(100vw-32px))] border-[1.5px] border-rule bg-bg p-6 text-fg backdrop:bg-overlay"
        >
          <h2 className="mt-0 mb-3 text-2xl font-extrabold">{t("settingsAccount.deleteConfirmTitle")}</h2>
          <p className="mt-0 mb-6 text-[15px] leading-[1.6]">{t("settingsAccount.deleteConfirmBody")}</p>
          {deleteAccount.isError && <FormError>{errorMessage(deleteAccount.error, t)}</FormError>}
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <form method="dialog">
              <button type="submit" className="btn btn-outline">
                {t("settingsAccount.cancel")}
              </button>
            </form>
            <DeleteButton
              label={t("settingsAccount.deleteConfirm")}
              disabled={deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}

type DeleteButtonProps = { label: string; disabled?: boolean; onClick: () => void };

function DeleteButton({ label, disabled, onClick }: DeleteButtonProps) {
  return (
    <button type="button" className="btn btn-danger" disabled={disabled} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true" className="flex-none">
        <path d={TRASH_ICON} />
      </svg>
      {label}
    </button>
  );
}
