/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// A new version takes over open tabs right away.
void self.skipWaiting();
clientsClaim();

// Cache the built app files (JS, CSS, fonts, icons) so repeat visits load fast.
// API requests are never cached: there is no offline mode in the MVP.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Lane 4 adds the "push" and "notificationclick" handlers for reminders.
