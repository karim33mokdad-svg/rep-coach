/* Rep Coach — Spotify remote. Controls the Spotify app on your phone (play, pause, skip, start a playlist)
 * through Spotify's Web API, signed in with PKCE (no secret, no server). Needs Spotify Premium and your own
 * Client ID from developer.spotify.com. Tokens stay on this phone under `repcoach-spotify-v1` (never rename it).
 *
 * iPhone note: a Home Screen app keeps its storage separate from Safari, and the Spotify sign-in page can
 * finish in Safari's sheet instead of the app. When that happens the page shows a one-time connection code
 * to copy, and Settings has a field to paste it.
 */
(function (root) {
  'use strict';
  const KEY = 'repcoach-spotify-v1';
  const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
  const AUTH = 'https://accounts.spotify.com/authorize', TOKEN = 'https://accounts.spotify.com/api/token', API = 'https://api.spotify.com/v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rand = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');

  const SP = {
    get clientId() { return read().clientId || ''; },
    setClientId(id) { const s = read(); s.clientId = String(id || '').trim(); write(s); },
    get connected() { return !!read().refresh; },
    // older connections were made before playlists were added; they need one more sign-in
    get canBrowse() { const sc = read().scope; return sc == null ? false : /playlist-read-private/.test(sc); },
    redirectUri,
    async connect() {
      const s = read(); if (!s.clientId) throw new Error('Add your Client ID first.');
      const verifier = rand(48), challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      const nonce = rand(9);
      s.pending = { nonce, verifier, at: Date.now() }; write(s);
      // The verifier rides in `state` too, so the sign-in can finish in Safari's sheet if the Home Screen app's storage isn't there.
      const q = new URLSearchParams({ client_id: s.clientId, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state: `rc~${nonce}~${verifier}~${s.clientId}` });
      location.assign(`${AUTH}?${q}`);
    },
    // Call on start-up. Returns null (nothing to do), { connected: true }, { code: '…' } (copy this into the app) or { error }.
    async handleRedirect() {
      const q = new URLSearchParams(location.search);
      const state = q.get('state') || '';
      if (!state.startsWith('rc~')) return null;
      history.replaceState(null, '', redirectUri());
      if (q.get('error')) return { error: q.get('error') === 'access_denied' ? 'You cancelled the Spotify sign-in.' : `Spotify said: ${q.get('error')}` };
      const [, nonce, verifierFromState, clientFromState] = state.split('~');
      const s = read(), sameApp = s.pending && s.pending.nonce === nonce;
      const clientId = sameApp ? s.clientId : clientFromState;
      try {
        const t = await tokenRequest({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: redirectUri(), client_id: clientId, code_verifier: sameApp ? s.pending.verifier : verifierFromState });
        if (sameApp) { delete s.pending; store(s, t, clientId); return { connected: true }; }
        return { code: btoa(JSON.stringify({ c: clientId, r: t.refresh_token })) };
      } catch (e) { return { error: e.message }; }
    },
    async pasteCode(code) {
      let o; try { o = JSON.parse(atob(String(code).trim())); } catch (e) { throw new Error('That code isn’t complete. Copy the whole code from the Spotify page again.'); }
      if (!o.c || !o.r) throw new Error('That code isn’t complete. Copy the whole code from the Spotify page again.');
      const s = read(); s.clientId = o.c; s.refresh = o.r; s.access = null; s.exp = 0; write(s);
      await SP.token(); // proves the code works
    },
    disconnect() { const s = read(); write({ clientId: s.clientId }); },
    async token() {
      const s = read(); if (!s.refresh) throw new Error('Spotify isn’t connected.');
      if (s.access && Date.now() < s.exp - 60000) return s.access;
      const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refresh, client_id: s.clientId });
      store(s, t, s.clientId); return t.access_token;
    },
    async api(method, path, body, retried) {
      const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + await SP.token(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      if (r.status === 401 && !retried) { const s = read(); s.access = null; write(s); return SP.api(method, path, body, true); }
      if (r.status === 204 || r.status === 202) return null;
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok) {
        const reason = j && j.error && (j.error.reason || j.error.message) || '';
        const err = new Error(/NO_ACTIVE_DEVICE/i.test(reason) || r.status === 404 ? 'Spotify isn’t open on any device. Open the Spotify app, play anything for a second, then try again.'
          : /PREMIUM/i.test(reason) || r.status === 403 ? 'Spotify only allows remote control with Premium.' : `Spotify didn’t accept that (${r.status}).`);
        err.status = r.status; err.noDevice = /NO_ACTIVE_DEVICE/i.test(reason) || r.status === 404; throw err;
      }
      return j;
    },
    async now() {
      const j = await SP.api('GET', '/me/player');
      if (!j || !j.item) return { playing: false, track: null, device: j && j.device ? j.device.name : null };
      return { playing: !!j.is_playing, track: j.item.name, artist: (j.item.artists || []).map(a => a.name).join(', '), device: j.device ? j.device.name : null };
    },
    async deviceId() {
      const j = await SP.api('GET', '/me/player/devices'); const ds = (j && j.devices) || [];
      const d = ds.find(x => x.is_active) || ds.find(x => /smartphone/i.test(x.type)) || ds[0];
      return d ? d.id : null;
    },
    async playlists() {
      const j = await SP.api('GET', '/me/playlists?limit=50');
      return ((j && j.items) || []).filter(Boolean).map(p => ({ id: p.id, name: p.name, uri: p.uri, link: p.external_urls && p.external_urls.spotify, image: imgOf(p.images), count: (p.items || p.tracks || {}).total ?? null, owner: p.owner && p.owner.display_name }));
    },
    // Spotify only lists the songs of playlists you own or collaborate on; for others this returns null.
    async tracks(id) {
      let j;
      try { j = await SP.api('GET', `/playlists/${id}/items?limit=100`); }
      catch (e) { if (e.status === 403 || e.status === 404) return null; try { j = await SP.api('GET', `/playlists/${id}/tracks?limit=100`); } catch (e2) { return null; } }
      if (!j || !j.items) return null;
      return j.items.map(x => x && (x.item || x.track)).filter(t => t && t.uri)
        .map(t => ({ uri: t.uri, name: t.name, artist: (t.artists || []).map(a => a.name).join(', '), ms: t.duration_ms, image: imgOf(t.album && t.album.images, true) }));
    },
    async play(contextUri, trackUri) {
      const body = contextUri ? { context_uri: contextUri, ...(trackUri ? { offset: { uri: trackUri } } : {}) } : undefined;
      try { return await SP.api('PUT', '/me/player/play', body); }
      catch (e) { if (e.status !== 404) throw e; const id = await SP.deviceId(); if (!id) throw e; return SP.api('PUT', '/me/player/play?device_id=' + encodeURIComponent(id), body); }
    },
    pause() { return SP.api('PUT', '/me/player/pause'); },
    next() { return SP.api('POST', '/me/player/next'); },
    prev() { return SP.api('POST', '/me/player/previous'); },
    // https://open.spotify.com/playlist/ID?si=… → spotify:playlist:ID (also albums and artists)
    uriFromLink(link) { const m = String(link || '').match(/open\.spotify\.com\/(?:intl-\w+\/)?(playlist|album|artist)\/([A-Za-z0-9]+)/); return m ? `spotify:${m[1]}:${m[2]}` : null; }
  };
  function imgOf(images, small) { if (!images || !images.length) return null; const s = [...images].sort((a, b) => (a.width || 0) - (b.width || 0)); return (small ? s[0] : s.find(i => (i.width || 0) >= 120) || s[s.length - 1]).url; }
  async function tokenRequest(params) {
    const r = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error === 'invalid_client' ? 'Spotify doesn’t recognise that Client ID.' : j.error === 'invalid_grant' ? 'The sign-in expired. Tap Connect Spotify again.' : `Spotify sign-in failed (${j.error || r.status}).`);
    return j;
  }
  function store(s, t, clientId) { s.clientId = clientId; s.access = t.access_token; s.exp = Date.now() + (t.expires_in || 3600) * 1000; if (t.refresh_token) s.refresh = t.refresh_token; if (t.scope != null) s.scope = t.scope; write(s); }
  root.RepSpotify = SP;
})(typeof window !== 'undefined' ? window : globalThis);
