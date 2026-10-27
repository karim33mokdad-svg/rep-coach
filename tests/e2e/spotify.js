// Spotify remote with Spotify's servers mocked: connect (same app and Safari-sheet code paths), mini player, auto-start, errors.
// Run: node tests/e2e/spotify.js   (needs playwright + a local server on 8765)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
let pass = 0, fail = 0;
const check = (n, ok, info) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${n}${!ok && info ? '  → ' + info : ''}`); };
const CID = 'a'.repeat(32);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { window.speechSynthesis.speak = () => {}; });
  await p.route('**/mp/pose.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.Pose=class{setOptions(){}onResults(){}async initialize(){}}' }));
  await p.route('https://fonts.googleapis.com/**', r => r.abort());
  const calls = []; let playing = false, awake = true, tokenBodies = [];
  await ctx.route('https://accounts.spotify.com/authorize**', r => { const u = new URL(r.request().url()); calls.push('authorize'); r.fulfill({ status: 302, headers: { location: `${u.searchParams.get('redirect_uri')}?code=CODE1&state=${encodeURIComponent(u.searchParams.get('state'))}` } }); });
  await ctx.route('https://accounts.spotify.com/api/token', r => { const body = new URLSearchParams(r.request().postData()); tokenBodies.push(Object.fromEntries(body)); r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ access_token: 'AT' + tokenBodies.length, expires_in: 3600, refresh_token: 'RT' + tokenBodies.length, scope: 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative' }) }); });
  await ctx.route('https://api.spotify.com/v1/**', r => {
    const req = r.request(), path = new URL(req.url()).pathname + new URL(req.url()).search, h = { 'access-control-allow-origin': '*' };
    calls.push(req.method() + ' ' + path + (req.postData() ? ' ' + req.postData() : ''));
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...h, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path === '/v1/me/player' && req.method() === 'GET') return r.fulfill({ contentType: 'application/json', headers: h, body: JSON.stringify({ is_playing: playing, device: { name: 'iPhone' }, item: { name: 'Eye of the Tiger', artists: [{ name: 'Survivor' }] } }) });
    if (path.startsWith('/v1/me/playlists')) return r.fulfill({ contentType: 'application/json', headers: h, body: JSON.stringify({ items: [{ id: 'PL1', name: 'Bell Beast', uri: 'spotify:playlist:PL1', external_urls: { spotify: 'https://open.spotify.com/playlist/PL1' }, images: [], items: { total: 2 }, owner: { display_name: 'Karim' } }, { id: 'PL2', name: 'Beast Mode', uri: 'spotify:playlist:PL2', images: [], items: { total: 50 }, owner: { display_name: 'Spotify' } }] }) });
    if (path.startsWith('/v1/playlists/PL1/items')) return r.fulfill({ contentType: 'application/json', headers: h, body: JSON.stringify({ items: [{ item: { uri: 'spotify:track:T1', name: 'Till I Collapse', duration_ms: 297000, artists: [{ name: 'Eminem' }], album: { images: [] } } }, { item: { uri: 'spotify:track:T2', name: 'Stronger', duration_ms: 312000, artists: [{ name: 'Kanye West' }], album: { images: [] } } }] }) });
    if (path.startsWith('/v1/playlists/PL2/')) return r.fulfill({ status: 403, contentType: 'application/json', headers: h, body: '{"error":{"status":403,"message":"Forbidden"}}' });
    if (path === '/v1/me/player/devices') return r.fulfill({ contentType: 'application/json', headers: h, body: JSON.stringify({ devices: awake ? [{ id: 'D1', is_active: false, type: 'Smartphone' }] : [] }) });
    if (path === '/v1/me/player/play' && !awake) return r.fulfill({ status: 404, contentType: 'application/json', headers: h, body: '{"error":{"status":404,"message":"Player command failed: No active device found","reason":"NO_ACTIVE_DEVICE"}}' });
    if (path.startsWith('/v1/me/player/play')) { playing = true; return r.fulfill({ status: 204, headers: h }); }
    if (path.startsWith('/v1/me/player/pause')) { playing = false; return r.fulfill({ status: 204, headers: h }); }
    if (path.startsWith('/v1/me/player/next')) return r.fulfill({ status: 204, headers: h });
    r.fulfill({ status: 404, contentType: 'application/json', headers: h, body: '{"error":{"status":404,"message":"x","reason":"NO_ACTIVE_DEVICE"}}' });
  });
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#openMore');
  await p.click('#openMore'); await p.waitForSelector('#spGo');
  check('settings explain the setup with the exact redirect URI', (await p.textContent('#spUri')) === 'http://localhost:8765/');
  await p.fill('#spId', 'nope'); await p.click('#spGo');
  check('a malformed Client ID is refused with a reason', (await p.textContent('#spErr')).includes('32 letters'));
  await p.fill('#mSpot', 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=abc'); await p.dispatchEvent('#mSpot', 'change');
  await p.fill('#spId', CID); await p.click('#spGo');
  await p.waitForSelector('#sAuto', { timeout: 10000 });
  check('connect: sign-in, code exchange with PKCE, back in settings as connected', calls[0] === 'authorize' && tokenBodies[0].code_verifier && tokenBodies[0].client_id === CID && (await p.textContent('#vMore')).includes('Connected'));
  check('the address bar is cleaned after sign-in', !(await p.evaluate(() => location.search)));
  // start a workout: playlist auto-starts and the mini player shows the song
  await p.evaluate(() => window.__kb.openWorkout('rehab-core')); await p.click('#startW');
  await p.waitForFunction(() => (document.getElementById('spBar') || {}).textContent?.includes('Eye of the Tiger'), null, { timeout: 8000 });
  check('Start plays your playlist on Spotify', calls.some(c => c.startsWith('PUT /v1/me/player/play') && c.includes('spotify:playlist:37i9dQZF1DX76Wlfdnj7AP')));
  check('the player shows the song and artist', (await p.textContent('#spBar')).includes('Survivor'));
  await p.click('[data-sp="toggle"]'); await p.waitForTimeout(900);
  check('pause works', calls.some(c => c.startsWith('PUT /v1/me/player/pause')) && (await p.getAttribute('[data-sp="toggle"]', 'aria-label')) === 'Play music');
  await p.click('[data-sp="next"]'); await p.waitForTimeout(300);
  check('skip works', calls.some(c => c.startsWith('POST /v1/me/player/next')));
  // browse playlists and pick a song
  await p.click('#pMusic'); await p.waitForSelector('#spBrowse [data-pl]');
  check('♫ lists your Spotify playlists', (await p.textContent('#spBrowse')).includes('Bell Beast') && (await p.textContent('#spBrowse')).includes('Beast Mode'));
  await p.click('#spBrowse [data-pl="0"]'); await p.waitForSelector('#plTracks [data-t]');
  check('opening a playlist shows its songs', (await p.textContent('#plTracks')).includes('Till I Collapse') && (await p.textContent('#plTracks')).includes('4:57'));
  await p.click('#plTracks [data-t="1"]'); await p.waitForTimeout(300);
  check('tapping a song plays it inside that playlist', calls.some(c => c.startsWith('PUT /v1/me/player/play') && c.includes('"offset":{"uri":"spotify:track:T2"}') && c.includes('spotify:playlist:PL1')));
  await p.click('#plUse');
  check('Use for workouts saves it as the Start playlist', (await p.evaluate(() => window.__kb.D.settings.spotify)).includes('/playlist/PL1'));
  await p.click('#plBack'); await p.click('#spBrowse [data-pl="1"]'); await p.waitForSelector('#plTracks .note');
  check('playlists you don\u2019t own still play, with a plain note about songs', (await p.textContent('#plTracks')).includes('only shows the songs'));
  await p.click('#closeSheet');
  // Spotify asleep on the phone: offer to open it, then start by itself on return
  awake = false; playing = false; await p.waitForTimeout(5200);
  await p.click('[data-sp="toggle"]'); await p.waitForTimeout(400);
  check('asleep: the bar says so and offers Open Spotify', (await p.textContent('#spBar')).includes('asleep') && await p.isVisible('#spBar a.link'));
  awake = true; const before = calls.filter(c => c.startsWith('PUT /v1/me/player/play')).length;
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForTimeout(1500);
  check('coming back to the app starts the music by itself', calls.filter(c => c.startsWith('PUT /v1/me/player/play')).length > before && playing);
  await p.click('#pExit');
  // the Safari-sheet path: no pending sign-in in this storage → shows a code; pasting it connects
  await p.evaluate(() => localStorage.removeItem('repcoach-spotify-v1'));
  await p.goto(`http://localhost:8765/?code=CODE2&state=${encodeURIComponent(`rc~nonce~verifierXYZ~${CID}`)}`);
  await p.waitForSelector('#spOut');
  const code = await p.inputValue('#spOut');
  check('sign-in finished elsewhere shows a code to copy', code.length > 20 && tokenBodies.at(-1).code_verifier === 'verifierXYZ');
  await p.reload(); await p.waitForSelector('#openMore'); await p.click('#openMore');
  await p.click('#vMore details:has(#spCode) summary'); await p.fill('#spCode', 'garbage'); await p.click('#spPaste');
  check('a broken code gets a plain error', (await p.textContent('#spErr')).includes('isn’t complete'));
  await p.fill('#spCode', code); await p.click('#spPaste'); await p.waitForSelector('#sAuto');
  check('pasting the code connects', tokenBodies.at(-1).grant_type === 'refresh_token');
  // no device open
  await p.unroute('https://api.spotify.com/v1/**');
  await ctx.route('https://api.spotify.com/v1/**', r => r.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":{"status":404,"message":"x","reason":"NO_ACTIVE_DEVICE"}}' }));
  await p.click('#spTest'); await p.waitForTimeout(500);
  check('no active device says to open Spotify', (await p.textContent('#spErr')).includes('Open Spotify'));
  await p.click('#spOff');
  check('disconnect', await p.isVisible('#spGo'));
  console.log('page errors:', errs.length ? errs : 'none'); console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
