import type { ComponentType } from "react";
import { Navigate, type RouteObject } from "react-router";

// Every screen is its own chunk, downloaded the first time it is visited.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

export const routes: RouteObject[] = [
  { path: "/", lazy: lazyPage(() => import("./pages/LandingPage")) },
  { path: "/login", lazy: lazyPage(() => import("./pages/LoginPage")) },
  { path: "/signup", lazy: lazyPage(() => import("./pages/SignupPage")) },
  { path: "/onboarding/1", lazy: lazyPage(() => import("./pages/OnboardingNamePage")) },
  { path: "/onboarding/2", lazy: lazyPage(() => import("./pages/OnboardingProjectsPage")) },
  { path: "/privacy", lazy: lazyPage(() => import("./pages/PrivacyPage")) },
  { path: "/terms", lazy: lazyPage(() => import("./pages/TermsPage")) },
  {
    // Signed-in screens. Lane 1 adds the auth guard here.
    path: "/app",
    lazy: lazyPage(() => import("./shell/AppShell")),
    children: [
      { index: true, element: <Navigate to="today" replace /> },
      { path: "today", lazy: lazyPage(() => import("./pages/TodayPage")) },
      { path: "inbox", lazy: lazyPage(() => import("./pages/InboxPage")) },
      { path: "upcoming", lazy: lazyPage(() => import("./pages/UpcomingPage")) },
      { path: "logbook", lazy: lazyPage(() => import("./pages/LogbookPage")) },
      { path: "projects/:projectId", lazy: lazyPage(() => import("./pages/ProjectPage")) },
      { path: "settings", lazy: lazyPage(() => import("./pages/SettingsPage")) },
    ],
  },
  { path: "*", lazy: lazyPage(() => import("./pages/NotFoundPage")) },
];
