// self.addEventListener('install', function(event) {
//     event.waitUntil(
//       caches.open('pwa-english-27-cache').then(function(cache) {
//         return cache.addAll([
//           '/',
//           'assets/icons/icon-192x192.png',
//           'assets/favicon.png',
//         ]);
//       })
//     );
//   });
  
  // self.addEventListener('fetch', function(event) {
  //   event.respondWith(
  //     caches.match(event.request).then(function(response) {
  //       return response || fetch(event.request);
  //     })
  //   );
  // });
  