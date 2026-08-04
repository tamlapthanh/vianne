const CACHE_PREFIX = "vianne-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const MAX_CACHE_ENTRIES = 80;
const CACHE_ENABLED = new URL(self.location.href).searchParams.get("shell-cache") === "on";
const SCOPE_URL = new URL(self.registration.scope);
const SHELL_PAGES = ["./index.html", "./app.html"];
const FIXED_SHELL_ASSETS = [
  "./manifest.json",
  "./assets/favicon.png",
  "./assets/icons/pwa-icon-192.png",
  "./assets/icons/pwa-icon-512.png"
];
const FIXED_ASSET_PATHS = FIXED_SHELL_ASSETS
  .map((path) => new URL(path, SCOPE_URL).pathname);

function toScopeUrl(path) {
  return new URL(path, SCOPE_URL);
}

function isLessonOrApiUrl(url) {
  return url.pathname.startsWith("/api/")
    || url.pathname.includes("/api/")
    || url.pathname.includes("/assets/books/");
}

function isSuccessfulLocalResponse(response) {
  return response?.ok && response.type !== "opaque";
}

function discoverLocalAssets(html, pageUrl) {
  const urls = new Set();
  const attributePattern = /(?:src|href)=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], pageUrl);
    if (url.origin === SCOPE_URL.origin && !isLessonOrApiUrl(url)) urls.add(url.href);
  }
  return [...urls];
}

async function fetchAndCache(cache, url) {
  try {
    const request = new Request(url, { cache: "reload" });
    const response = await fetch(request);
    if (isSuccessfulLocalResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return null;
  }
}

async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHE_ENTRIES;
  if (excess > 0) {
    await Promise.all(keys.slice(0, excess).map((request) => cache.delete(request)));
  }
}

async function precacheAppShell() {
  if (!CACHE_ENABLED) return;
  const cache = await caches.open(CACHE_NAME);
  const discoveredAssets = new Set(FIXED_SHELL_ASSETS.map((path) => toScopeUrl(path).href));

  for (const pagePath of SHELL_PAGES) {
    const pageUrl = toScopeUrl(pagePath);
    const response = await fetchAndCache(cache, pageUrl);
    if (!isSuccessfulLocalResponse(response)) continue;
    const html = await response.clone().text();
    discoverLocalAssets(html, pageUrl).forEach((url) => discoveredAssets.add(url));
  }

  await Promise.allSettled(
    [...discoveredAssets].map((url) => fetchAndCache(cache, url))
  );
  await trimCache(cache);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isSuccessfulLocalResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallbackPage = new URL(request.url).pathname.endsWith("/app.html")
      ? "./app.html"
      : "./index.html";
    return await cache.match(toScopeUrl(fallbackPage)) || Response.error();
  }
}

async function cacheFirstShellAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isSuccessfulLocalResponse(response)) {
    await cache.put(request, response.clone());
    await trimCache(cache);
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await precacheAppShell();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

if (CACHE_ENABLED) {
  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET"
      || url.origin !== SCOPE_URL.origin
      || isLessonOrApiUrl(url)) return;

    if (request.mode === "navigate") {
      event.respondWith(networkFirstNavigation(request));
      return;
    }

    const isFixedAsset = FIXED_ASSET_PATHS.includes(url.pathname);
    const isStaticShellAsset = ["script", "style", "font"].includes(request.destination);
    const isShellImage = request.destination === "image"
      && (url.pathname.includes("/assets/icons/")
        || /\/assets\/(?:favicon|pwa-icon-)/.test(url.pathname));
    if (isFixedAsset || isStaticShellAsset || isShellImage) {
      event.respondWith(cacheFirstShellAsset(request));
    }
  });
}
