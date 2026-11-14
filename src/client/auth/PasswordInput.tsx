import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";

type PasswordInputProps = Omit<ComponentProps<"input">, "type" | "className"> & { invalid?: boolean };

/** Password field with the "แสดง / ซ่อน" button from the Login mockup. */
export function PasswordInput({ invalid = false, ...inputProps }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className="input pr-[84px]"
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="password-toggle mono"
        aria-label={visible ? t("auth.hidePasswordLabel") : t("auth.showPasswordLabel")}
        onClick={() => setVisible(!visible)}
      >
        <Icon name="eye" size={14} />
        {visible ? t("auth.hidePassword") : t("auth.showPassword")}
      </button>
    </div>
  );
}
