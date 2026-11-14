import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";
import { loginPathFor, safeNextPath, startPath } from "./next-path";
import { useMe } from "./use-me";

/** Signed-in, onboarded users only: the app itself (/app/*). */
export function SignedInOnly() {
  const { data: me, isPending } = useMe();
  const location = useLocation();

  if (isPending) return null;
  if (!me) return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  if (me.settings.onboardedAt === null) return <Navigate to="/onboarding/1" replace />;
  return <Outlet />;
}

/** Onboarding, shown once: signed-in users who have not finished it. */
export function OnboardingOnly() {
  const { data: me, isPending } = useMe();

  if (isPending) return null;
  if (!me) return <Navigate to={loginPathFor("/app")} replace />;
  if (me.settings.onboardedAt !== null) return <Navigate to={startPath(me.settings.startPage)} replace />;
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
