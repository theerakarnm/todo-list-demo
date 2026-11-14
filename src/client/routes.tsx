import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import { SignedInOnly, SignedOutOnly, StartPageRedirect } from "./auth/guards";

// Every screen is its own chunk, downloaded the first time it is visited.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

/** Wraps a route in a guard: a layout route that renders it only for the right visitors. */
function guarded(Guard: ComponentType, route: RouteObject): RouteObject {
  return { Component: Guard, children: [route] };
}

// Shown while the first screen's chunk loads: just the page background.
function BlankPage() {
  return null;
}

const screens: RouteObject[] = [
  { path: "/", lazy: lazyPage(() => import("./pages/LandingPage")) },
  guarded(SignedOutOnly, { path: "/login", lazy: lazyPage(() => import("./pages/LoginPage")) }),
  guarded(SignedOutOnly, { path: "/signup", lazy: lazyPage(() => import("./pages/SignupPage")) }),
  { path: "/forgot-password", lazy: lazyPage(() => import("./pages/ForgotPasswordPage")) },
  { path: "/reset-password", lazy: lazyPage(() => import("./pages/ResetPasswordPage")) },
  { path: "/verify-email", lazy: lazyPage(() => import("./pages/VerifyEmailPage")) },
  { path: "/onboarding/1", lazy: lazyPage(() => import("./pages/OnboardingNamePage")) },
  { path: "/onboarding/2", lazy: lazyPage(() => import("./pages/OnboardingProjectsPage")) },
  { path: "/privacy", lazy: lazyPage(() => import("./pages/PrivacyPage")) },
  { path: "/terms", lazy: lazyPage(() => import("./pages/TermsPage")) },
  guarded(SignedInOnly, {
    // Signed-in screens.
    path: "/app",
    lazy: lazyPage(() => import("./shell/AppShell")),
    children: [
      { index: true, Component: StartPageRedirect },
      { path: "today", lazy: lazyPage(() => import("./pages/TodayPage")) },
      { path: "inbox", lazy: lazyPage(() => import("./pages/InboxPage")) },
      { path: "upcoming", lazy: lazyPage(() => import("./pages/UpcomingPage")) },
      { path: "logbook", lazy: lazyPage(() => import("./pages/LogbookPage")) },
      { path: "projects/:projectId", lazy: lazyPage(() => import("./pages/ProjectPage")) },
      { path: "settings", lazy: lazyPage(() => import("./pages/SettingsPage")) },
    ],
  }),
  { path: "*", lazy: lazyPage(() => import("./pages/NotFoundPage")) },
];

export const routes: RouteObject[] = [{ HydrateFallback: BlankPage, children: screens }];
