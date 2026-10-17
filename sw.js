// Cache-first service worker: the app shell and the pose model work offline after the first visit.
const CACHE = 'repcoach-v1';
const SHELL = ['./', 'index.html', 'coach.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'mp/pose.js', 'mp/pose_web.binarypb', 'mp/pose_solution_packed_assets_loader.js', 'mp/pose_solution_packed_assets.data',
  'mp/pose_solution_simd_wasm_bin.js', 'mp/pose_solution_simd_wasm_bin.wasm', 'mp/pose_landmark_full.tflite', 'mp/pose_landmark_lite.tflite'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
