"use strict";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data?.json() ?? {}; } catch { payload = {}; }
    const title = typeof payload.title === "string" && payload.title.length <= 80 ? payload.title : "WBD Workspace";
    const body = typeof payload.body === "string" && payload.body.length <= 180 ? payload.body : "Er vraagt iets veilig om je aandacht.";
    const url = typeof payload.data?.url === "string" && payload.data.url.startsWith("/workspace/wbd/") ? payload.data.url : "/workspace/wbd/mail";
    await self.registration.showNotification(title, {
      body,
      icon: "/wbd-owner-icon.svg",
      badge: "/wbd-owner-icon.svg",
      tag: typeof payload.tag === "string" ? payload.tag.slice(0, 180) : "wbd-workspace",
      renotify: payload.renotify === true,
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || "/workspace/wbd/mail", self.location.origin);
    if (target.origin !== self.location.origin || !target.pathname.startsWith("/workspace/wbd/")) target.pathname = "/workspace/wbd/mail";
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === target.origin);
    if (existing) { await existing.navigate(target.href); return existing.focus(); }
    return self.clients.openWindow(target.href);
  })());
});
