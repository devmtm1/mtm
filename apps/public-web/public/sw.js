/*
 * Service worker de l'application installable (PWA).
 *
 * Volontairement minimal et sans risque pour les données :
 *  - rien de ce qui vient de l'API (autre origine) ni d'un compte n'est mis en cache ;
 *  - les fichiers /assets/* (nom haché, immuables) sont servis depuis le cache ;
 *  - une page ouverte sans réseau affiche /offline.html au lieu d'une erreur.
 * Changer VERSION purge les anciens caches à l'activation.
 */
const VERSION = 'mtm-v2';
const SHELL = ['/offline.html', '/icons/icon-192.png', '/logomtm.jpeg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
