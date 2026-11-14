import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { PasswordInput } from "./PasswordInput";

type FieldProps = {
  id: string;
  label: string;
  /** Marks the input as wrong (thick orange underline). */
  invalid?: boolean;
  /** Id of the hint or error under the input. */
  describedBy?: string;
  className?: string;
  /** Hint or error shown under the input. */
  children?: ReactNode;
};

export function EmailField({ id, label, invalid, describedBy, className, children }: FieldProps) {
  const { t } = useTranslation();

  return (
    <div className={`field ${className ?? ""}`}>
      <label className="mono" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name="email"
        className="input"
        type="email"
        autoComplete="email"
        required
        placeholder={t("auth.emailPlaceholder")}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      {children}
    </div>
  );
}

type PasswordFieldProps = FieldProps & {
  name?: string;
  autoComplete: "current-password" | "new-password";
};

export function PasswordField({
  id,
  label,
  name = "password",
  autoComplete,
  invalid,
  describedBy,
  className,
  children,
}: PasswordFieldProps) {
  const isNew = autoComplete === "new-password";

  return (
    <div className={`field ${className ?? ""}`}>
      <label className="mono" htmlFor={id}>
        {label}
      </label>
      <PasswordInput
        id={id}
        name={name}
        autoComplete={autoComplete}
        required
        minLength={isNew ? LIMITS.passwordMinLength : undefined}
        invalid={invalid}
        aria-describedby={describedBy}
      />
      {children}
    </div>
  );
}
