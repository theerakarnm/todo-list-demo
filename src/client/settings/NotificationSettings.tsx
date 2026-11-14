import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../api/error-message";
import { useBrowserPush } from "../push/use-browser-push";
import type { Me } from "../auth/use-me";
import { useToast } from "../toast/ToastProvider";
import { useUpdateSettings } from "./use-update-settings";

const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One settings row: ruled off from the next by a 1.5px line, as in the Settings mockup. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="border-b-[1.5px] border-rule py-5">{children}</div>;
}

/** Settings → Notifications: this device's push subscription and the daily digest. */
export function NotificationSettings({ settings }: { settings: Me["settings"] }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const updateSettings = useUpdateSettings();
  const push = useBrowserPush((turningOn) =>
    showToast({ tone: "error", message: t(turningOn ? "notifications.enableFailed" : "notifications.disableFailed") }),
  );
  const saveDigest = (changes: { digestEnabled: boolean } | { digestTime: string }) =>
    updateSettings.mutate(changes, {
      onError: (error) => showToast({ tone: "error", message: apiErrorMessage(t, error) }),
    });

  const explanation = push.support === "ready" ? (push.denied ? "denied" : null) : push.support;

  return (
    <>
      <Row>
        <label className="switch">
          <input
            type="checkbox"
            checked={push.on}
            disabled={push.support !== "ready"}
            onChange={(event) => push.turn(event.target.checked)}
          />
          <span className="switch-track" />
          <span className="text-base font-semibold">{t("notifications.browserLabel")}</span>
        </label>
        <p className="m-0 mt-1.5 ml-[68px] text-sm leading-[1.6] text-fg-muted">
          {explanation ? t(`notifications.${explanation}`) : t("notifications.browserHint")}
        </p>
      </Row>
      <Row>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.digestEnabled}
            onChange={(event) => saveDigest({ digestEnabled: event.target.checked })}
          />
          <span className="switch-track" />
          <span className="text-base font-semibold">{t("notifications.digestLabel")}</span>
        </label>
        <div className="mt-3.5 ml-[68px] flex flex-wrap items-center gap-3.5">
          <label className="mono" htmlFor="digest-time">
            {t("notifications.digestTimeLabel")}
          </label>
          <input
            id="digest-time"
            className="input min-h-12 w-40"
            type="time"
            value={settings.digestTime}
            onChange={(event) => LOCAL_TIME.test(event.target.value) && saveDigest({ digestTime: event.target.value })}
          />
        </div>
      </Row>
    </>
  );
}
