/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Cache TMDB poster/backdrop images — cache-first, 30-day expiry, 200 max
    {
      matcher: /^https:\/\/image\.tmdb\.org\/t\/p\/.*/i,
      handler: new CacheFirst({
        cacheName: "tmdb-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // Cache Google Books cover images
    {
      matcher: /^https:\/\/books\.google\.com\/books\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-books-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Cache OpenLibrary cover images
    {
      matcher: /^https:\/\/covers\.openlibrary\.org\/.*/i,
      handler: new CacheFirst({
        cacheName: "openlibrary-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Cache AniList cover images
    {
      matcher: /^https:\/\/s4\.anilist\.co\/.*/i,
      handler: new CacheFirst({
        cacheName: "anilist-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Cache Google Fonts stylesheets — stale-while-revalidate
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
      }),
    },
    // Cache Google Fonts webfont files — cache-first, 1 year
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Web Push Notifications ---

self.addEventListener("push", (event) => {
  if (event.data) {
    let data: any;
    try {
      data = event.data.json();
    } catch {
      data = { title: "Craveo Update", body: event.data.text() };
    }

    const options = {
      body: data.body || "You have a new update from Craveo!",
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png", // Typically a monochrome 96x96 icon is best, using this as fallback
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Craveo", options)
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open to the URL, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
