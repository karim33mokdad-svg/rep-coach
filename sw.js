// App code (html/js/manifest) is network-first so updates arrive on the next open; the heavy pose model files are cache-first.
const CACHE = 'repcoach-v5';
const SHELL = ['./', 'index.html', 'coach.js', 'library.js', 'workout.js', 'demo.js', 'app.js', 'workouts/index.json', 'workouts/2026-10-18-kb-power.json', 'clips/index.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'mp/pose.js', 'mp/pose_web.binarypb', 'mp/pose_solution_packed_assets_loader.js', 'mp/pose_solution_packed_assets.data',
  'mp/pose_solution_simd_wasm_bin.js', 'mp/pose_solution_simd_wasm_bin.wasm', 'mp/pose_landmark_full.tflite', 'mp/pose_landmark_lite.tflite'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const isModel = sameOrigin && url.pathname.includes('/mp/');
  const put = res => { if (res.ok && sameOrigin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; };
  if (isModel) { e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request)));
});
