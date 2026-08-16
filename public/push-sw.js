/* ParentPulse push service worker.
   Notifications only — this worker does no caching and does not affect
   installability or offline behaviour. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ParentPulse", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ParentPulse";
  const options = {
    body: payload.body || "",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    lang: payload.lang || "he",
    dir: payload.lang === "en" ? "ltr" : "rtl",
    tag: payload.tag || "parentpulse-daily",
    renotify: true,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.navigate(target);
          } catch {
            /* ignore */
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
