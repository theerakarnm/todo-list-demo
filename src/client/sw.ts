/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { openAppPath, readPushMessage, safeAppPath } from "./push/push-message";

declare const self: ServiceWorkerGlobalScope;

// A new version takes over open tabs right away.
void self.skipWaiting();
clientsClaim();

// Cache the built app files (JS, CSS, fonts, icons) so repeat visits load fast.
// API requests are never cached: there is no offline mode in the MVP.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// A reminder or digest arrives as a push; every push shows a notification.
self.addEventListener("push", (event) => {
  const message = readPushMessage(event.data?.text());
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/icons/icon-192.png",
      data: { url: message.url },
    }),
  );
});

// A tap opens the task (or Today): in an open app tab if there is one, else in a new window.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeAppPath(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      // Only tabs this service worker controls: navigate fails on any other.
      const tabs = await self.clients.matchAll({ type: "window" });
      await openAppPath(tabs, self.location.origin, path, (newPath) => self.clients.openWindow(newPath));
    })(),
  );
});
