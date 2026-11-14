import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";
import { useThemeFromSettings } from "../settings/use-theme-from-settings";
import { loginPathFor, onboardingPathFor, safeNextPath, startPath } from "./next-path";
import { useMe } from "./use-me";

/** Signed-in, onboarded users only: the app itself (/app/*). */
export function SignedInOnly() {
  const { data: me, isPending } = useMe();
  const location = useLocation();
  useThemeFromSettings(me?.settings.theme);

  if (isPending) return null;
  if (!me) return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  if (me.settings.onboardedAt === null) return <Navigate to={onboardingPathFor(location.pathname + location.search)} replace />;
  return <Outlet />;
}

/** Onboarding, shown once: signed-in users who have not finished it. Finishing goes on to `?next=`. */
export function OnboardingOnly() {
  const { data: me, isPending } = useMe();
  const [searchParams] = useSearchParams();

  if (isPending) return null;
  if (!me) return <Navigate to={loginPathFor("/app")} replace />;
  if (me.settings.onboardedAt !== null) {
    return <Navigate to={safeNextPath(searchParams.get("next")) ?? startPath(me.settings.startPage)} replace />;
  }
  return <Outlet />;
}

/** Login and Signup: a signed-in user goes on to `?next=` or the start page. */
export function SignedOutOnly() {
  const { data: me, isPending } = useMe();
  const [searchParams] = useSearchParams();

  if (isPending) return null;
  if (me) return <Navigate to={safeNextPath(searchParams.get("next")) ?? startPath(me.settings.startPage)} replace />;
  return <Outlet />;
}

/** `/app` on its own: the user's start page. Rendered inside `SignedInOnly`. */
export function StartPageRedirect() {
  const { data: me } = useMe();
  return me ? <Navigate to={startPath(me.settings.startPage)} replace /> : null;
}
