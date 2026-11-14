import type { ReactNode } from "react";

type AuthNoticeProps = {
  title: string;
  body: string;
  /** Links or buttons that lead on, e.g. "เข้าสู่ระบบ". */
  children?: ReactNode;
};

/** The result of an auth step (email sent, password saved, link expired) in place of its form. */
export function AuthNotice({ title, body, children }: AuthNoticeProps) {
  return (
    <section aria-labelledby="auth-notice-title" className="mt-6 border-t-2 border-rule pt-6">
      <h2 id="auth-notice-title" className="mt-0 mb-3 text-2xl font-extrabold">
        {title}
      </h2>
      <p className="mt-0 mb-0 text-base leading-[1.6]">{body}</p>
      {children}
    </section>
  );
}
