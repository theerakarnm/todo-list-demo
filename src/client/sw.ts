/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { parsePushMessage, pickClientToFocus, safeAppPath } from "./push/push-message";

declare const self: ServiceWorkerGlobalScope;

// A new version takes over open tabs right away.
void self.skipWaiting();
clientsClaim();

// Cache the built app files (JS, CSS, fonts, icons) so repeat visits load fast.
// API requests are never cached: there is no offline mode in the MVP.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// A reminder or digest arrives as a push; show it as a notification.
self.addEventListener("push", (event) => {
  const message = parsePushMessage(event.data?.json());
  if (!message) return;
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
  const url = safeAppPath(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const tab = pickClientToFocus(tabs, self.location.origin);
      if (tab) {
        await tab.focus();
        await tab.navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
