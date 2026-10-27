/* Rep Coach — kettlebell training UI: Today (programs), Workouts hub, Exercise library, Player, History.
 * The camera coach (index.html's inline script) stays as the Camera tab; the player hands sets to it through window.__repcoach.
 * Storage: localStorage key `repcoach-workouts-v1` (never rename it), technique clips in IndexedDB `repcoach-clips`.
 */
(() => {
'use strict';
const LIB = window.RepLib, WK = window.RepWorkout, DEMO = window.RepDemo;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'repcoach-workouts-v1';
const DEFAULTS = { v: 1, imported: [], custom: [], sessions: [], program: { id: 'back-to-bells', done: {} }, player: null,
  settings: { rehab: true, cleared: false, bells: [8, 12, 16, 20, 24], voice: true, beeps: true } };
const db = {
  read() { try { const v = JSON.parse(localStorage.getItem(KEY)); return v ? { ...DEFAULTS, ...v, settings: { ...DEFAULTS.settings, ...(v.settings || {}) }, program: { ...DEFAULTS.program, ...(v.program || {}) } } : structuredClone(DEFAULTS); } catch (e) { return structuredClone(DEFAULTS); } },
  write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { toast('Couldn’t save on this phone. Storage may be full.'); } }
};
let D = db.read();
const save = () => db.write(D);
const ALL_BELLS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48];
let bundled = []; // dated sessions from workouts/index.json

// ── Clips: your own looping technique videos, kept on this phone ──
const clips = {
  db: null, urls: {},
  open() { return this.db || (this.db = new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('no idb')); const r = indexedDB.open('repcoach-clips', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async tx(mode, fn) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction('clips', mode); const st = t.objectStore('clips'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); },
  async get(id) { try { return await this.tx('readonly', s => s.get(id)); } catch (e) { return null; } },
  async put(id, rec) { await this.tx('readwrite', s => s.put(rec, id)); delete this.urls[id]; },
  async del(id) { await this.tx('readwrite', s => s.delete(id)); delete this.urls[id]; },
  async keys() { try { return await this.tx('readonly', s => s.getAllKeys()); } catch (e) { return []; } },
  async url(id) {
    if (this.urls[id]) return this.urls[id];
    const r = await this.get(id);
    if (r && r.blob) return (this.urls[id] = { src: URL.createObjectURL(r.blob), start: r.start || 0, end: r.end || 0, own: true });
    if (bundledClips[id]) return (this.urls[id] = { src: bundledClips[id], start: 0, end: 0, own: false });
    return null;
  }
};
let bundledClips = {}; // clips/index.json: { exerciseId: "clips/file.mp4" } — licensed or self-filmed clips shipped with the app
let clipSet = new Set();

// Show an exercise's technique in a box: your clip on loop, otherwise the animated figure.
const stops = new Map();
async function mountMedia(box, exId, { small = false } = {}) {
  if (!box) return;
  stops.get(box)?.(); stops.delete(box);
  const ex = LIB.BY_ID[exId];
  const c = ex ? await clips.url(exId) : null;
  if (c) {
    box.innerHTML = `<video muted playsinline autoplay loop preload="auto"></video>${c.own ? '<span class="media-tag">Your clip</span>' : ''}`;
    const v = box.querySelector('video'); v.src = c.src;
    if (c.end) v.addEventListener('timeupdate', () => { if (v.currentTime >= c.end || v.currentTime < c.start - .2) v.currentTime = c.start; });
    v.addEventListener('loadedmetadata', () => { if (c.start) v.currentTime = c.start; v.play().catch(() => {}); });
    stops.set(box, () => { v.pause(); v.removeAttribute('src'); v.load(); });
    return;
  }
  box.innerHTML = `<canvas></canvas>${small ? '' : '<span class="media-tag">Demo figure · add your clip</span>'}`;
  const cv = box.querySelector('canvas');
  if (small) { requestAnimationFrame(() => DEMO.still(cv, ex ? ex.pattern : 'stand')); return; }
  requestAnimationFrame(() => stops.set(box, DEMO.start(cv, ex ? ex.pattern : 'stand')));
}
function stopAllMedia() { for (const f of stops.values()) f(); stops.clear(); }
function thumbs(root) { root.querySelectorAll('[data-thumb]').forEach(el => mountMedia(el, el.dataset.thumb, { small: !clipSet.has(el.dataset.thumb) })); }

// ── Voice and beeps ──
const voice = {
  say(t, urgent) { if (!D.settings.voice || !('speechSynthesis' in window)) return; if (urgent) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.05; speechSynthesis.speak(u); },
  unlock() { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } }
};
let actx = null;
function beep(freq = 880, ms = 120) {
  if (!D.settings.beeps) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = freq; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + ms / 1000); o.start(); o.stop(actx.currentTime + ms / 1000); } catch (e) {}
}
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2600); }

// ── Navigation ──
const VIEWS = ['vToday', 'vHub', 'vList', 'vWorkout', 'vLib', 'vEx', 'vHist', 'vSession', 'vMore', 'home', 'vPlayer', 'vFinish', 'vClip'];
const TAB_OF = { vToday: 'today', vHub: 'hub', vList: 'hub', vWorkout: 'hub', vLib: 'lib', vEx: 'lib', vHist: 'hist', vSession: 'hist', vMore: 'today', home: 'cam', vClip: 'lib' };
let backStack = [];
function show(id, { push = true } = {}) {
  const cur = VIEWS.find(v => $(v) && !$(v).hidden);
  if (push && cur && cur !== id && !['vPlayer', 'vFinish'].includes(cur)) backStack.push(cur);
  stopAllMedia();
  VIEWS.forEach(v => $(v) && ($(v).hidden = v !== id));
  const full = ['vPlayer', 'vFinish', 'vClip'].includes(id);
  $('tabs').hidden = full;
  document.querySelectorAll('#tabs [data-tab]').forEach(b => b.setAttribute('aria-current', b.dataset.tab === TAB_OF[id] ? 'page' : 'false'));
  window.scrollTo(0, 0);
}
function back() { const v = backStack.pop(); if (v) { (RENDER[v] || (() => {}))(); show(v, { push: false }); } else openTab('today'); }
function openTab(t) {
  backStack = [];
  if (t === 'today') { renderToday(); show('vToday', { push: false }); }
  if (t === 'hub') { renderHub(); show('vHub', { push: false }); }
  if (t === 'lib') { renderLib(); show('vLib', { push: false }); }
  if (t === 'hist') { renderHist(); show('vHist', { push: false }); }
  if (t === 'cam') show('home', { push: false });
}
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tab]'); if (t) { openTab(t.dataset.tab); return; }
  const b = ev.target.closest('[data-back]'); if (b) { back(); return; }
});

// ── Workouts: where they come from ──
function allWorkouts() { return [...LIB.WORKOUTS, ...bundled, ...D.imported, ...D.custom]; }
function findWorkout(id) {
  const m = String(id).match(/^(.+)@([\w-]+):(\d+):(\d+)$/); // a program day with that week's progression applied
  if (m) { const p = LIB.PROGRAMS.find(x => x.id === m[2]), wk = p && p.schedule.find(x => x.week === +m[3]); if (wk && wk.days[+m[4]]) return dayWorkout(p, wk, +m[4]); }
  return allWorkouts().find(w => w.id === id) || (D.player && D.player.w && D.player.w.id === id ? D.player.w : null);
}
const dayEntry = e => typeof e === 'string' ? { id: e, mods: null } : e;
function dayWorkout(p, wk, i) {
  const { id, mods } = dayEntry(wk.days[i]); const base = allWorkouts().find(w => w.id === id);
  if (!base || !mods) return base || null;
  const w = WK.applyMods(base, mods, D.settings.bells, `${p.id}:${wk.week}:${i}`);
  w.title = base.title; w.weekNote = `Week ${wk.week} · ${mods.note || ''}`; return w;
}
const BACK_LABEL = { ok: 'Back-safe', care: 'Go light', load: 'Needs clearance' };
const backAllowed = r => !(D.settings.rehab && r === 'load' && !D.settings.cleared);
function backChip(w) { const r = WK.backRating(w); return `<span class="chip back-${r}">${BACK_LABEL[r]}</span>`; }
function fmtDay(d) { const t = new Date(d + 'T12:00'), today = new Date(); const same = t.toDateString() === today.toDateString(); return (same ? 'Today · ' : '') + t.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); }
function wCard(w, opts = {}) {
  const secs = w.sections.filter(s => s.id !== 'warm');
  const main = secs[0] || w.sections[0];
  const ln = WK.lines(main).slice(0, 6);
  const f = WK.FORMAT_LABEL[(main.format || {}).type] || '';
  return `<button class="wcard" type="button" data-open-w="${esc(w.id)}">
    <span class="wcard-top">${opts.date ? `<span class="chip">${esc(fmtDay(w.date))}</span>` : ''}<b>${esc(w.title)}</b><span class="dim">${w.durationMin ? w.durationMin + ' min' : ''}</span></span>
    <span class="chips"><span class="chip">${esc(f)}</span>${w.level ? `<span class="chip">${esc(w.level)}</span>` : ''}${w.focus ? `<span class="chip">${esc(w.focus)}</span>` : ''}${backChip(w)}${opts.done ? '<span class="chip ok">Done</span>' : ''}</span>
    <span class="lines">${ln.map(esc).join('<br>')}${WK.lines(main).length > 6 ? '<br>…' : ''}</span></button>`;
}

// ── Today: program ──
const RENDER = {};
function programProgress(p) { const total = p.schedule.reduce((a, w) => a + w.days.length, 0); const done = Object.keys(D.program.done).filter(k => k.startsWith(p.id + ':')).length; return { total, done }; }
function nextDay(p) { for (const w of p.schedule) for (let i = 0; i < w.days.length; i++) if (!D.program.done[`${p.id}:${w.week}:${i}`]) return { week: w.week, i }; return null; }
let viewWeek = null;
function renderToday() {
  const p = LIB.PROGRAMS.find(x => x.id === D.program.id) || LIB.PROGRAMS[0];
  const pr = programProgress(p), nx = nextDay(p);
  if (viewWeek == null || !p.schedule.some(w => w.week === viewWeek)) viewWeek = nx ? nx.week : p.schedule[0].week;
  const wk = p.schedule.find(w => w.week === viewWeek);
  const gated = p.gate && viewWeek > 0 && !D.settings.cleared;
  const todayISO = new Date().toISOString().slice(0, 10);
  const dated = [...bundled, ...D.imported].filter(w => w.date).sort((a, b) => a.date < b.date ? 1 : -1);
  const pinned = dated.filter(w => w.date === todayISO);
  $('vToday').innerHTML = `
  <header class="hero">
    <div class="hero-row"><button class="link" type="button" id="changeProg">Change program</button><button class="icon-btn" type="button" id="openMore" aria-label="Settings and glossary">⚙︎</button></div>
    <span class="chips"><span class="chip">${esc(p.level)}</span><span class="chip ${D.settings.rehab ? 'back-ok' : ''}">${D.settings.rehab ? 'Rehab mode on' : 'Full training'}</span></span>
    <h1>${esc(p.name)}</h1>
    <p class="dim">${esc(p.description)}</p>
  </header>
  <div class="weeks" role="tablist">${p.schedule.map(w => `<button type="button" role="tab" data-week="${w.week}" aria-selected="${w.week === viewWeek}">Week ${w.week}</button>`).join('')}</div>
  <div class="progress"><span style="width:${(pr.done / pr.total * 100).toFixed(1)}%"></span></div>
  <p class="mono dim">${pr.done} of ${pr.total} days done · ${esc(wk.title)}</p>
  ${gated ? `<p class="note warn">${esc(p.gate)} When the physio clears you, turn on “Physio has cleared me” in settings.</p>` : ''}
  <div class="days">${wk.days.map((entry, i) => {
    const id = dayEntry(entry).id, w = dayWorkout(p, wk, i), key = `${p.id}:${wk.week}:${i}`, done = D.program.done[key], isNext = nx && nx.week === wk.week && nx.i === i;
    return `<button type="button" class="day${isNext ? ' next' : ''}${done ? ' done' : ''}" data-day="${i}">
      <span class="mono dim">Day ${i + 1}${done ? ' ✓' : ''}</span><b>${esc(w ? w.title : id)}</b>
      <span class="dim small">${w ? `${w.durationMin} min · ${BACK_LABEL[WK.backRating(w)]}` : ''}</span><span class="chev">${gated ? '🔒' : '›'}</span></button>`;
  }).join('')}</div>
  ${pinned.length || dated.length ? `<div class="lbl">From your coach</div><div class="stack">${(pinned.length ? pinned : dated.slice(0, 3)).map(w => wCard(w, { date: true, done: D.sessions.some(s => s.workoutId === w.id) })).join('')}</div>` : ''}
  <div class="lbl">Quick start</div>
  <div class="quick">
    <button type="button" class="qbtn" data-quick="rehab-core"><b>Back calm</b><span>15 min core control</span></button>
    <button type="button" class="qbtn" data-quick="rehab-tendon"><b>Tendons</b><span>15 min holds</span></button>
    <button type="button" class="qbtn" data-quick="upper-supported"><b>Upper body</b><span>12 min, back supported</span></button>
    <button type="button" class="qbtn" data-quick="build"><b>Build one</b><span>Pick time and focus</span></button>
  </div>`;
  $('vToday').querySelectorAll('[data-week]').forEach(b => b.onclick = () => { viewWeek = +b.dataset.week; renderToday(); });
  $('vToday').querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    const w = dayWorkout(p, wk, +b.dataset.day);
    if (gated) { toast(p.gate); }
    openWorkout(w, { program: { id: p.id, week: wk.week, i: +b.dataset.day } });
  });
  $('vToday').querySelectorAll('[data-open-w]').forEach(b => b.onclick = () => openWorkout(b.dataset.openW));
  $('vToday').querySelectorAll('[data-quick]').forEach(b => b.onclick = () => b.dataset.quick === 'build' ? openBuilder() : openWorkout(b.dataset.quick));
  $('changeProg').onclick = () => {
    const sheet = $('sheet');
    sheet.innerHTML = `<div class="sheet-card"><h2>Programs</h2><div class="stack" style="margin-top:12px">${LIB.PROGRAMS.map(x => { const pr = programProgress(x); return `<button type="button" class="hubcard" data-prog="${x.id}"><b>${esc(x.name)}${x.id === p.id ? ' ✓' : ''}</b><span>${esc(x.level)} · ${x.schedule.length} weeks · ${pr.done}/${pr.total} days done</span><span>${esc(x.description)}</span></button>`; }).join('')}</div>
      <div class="cta"><button class="btn ghost" type="button" id="closeSheet">Close</button></div></div>`;
    sheet.hidden = false; $('closeSheet').onclick = () => sheet.hidden = true;
    sheet.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => { D.program.id = b.dataset.prog; save(); viewWeek = null; sheet.hidden = true; renderToday(); });
  };
  $('openMore').onclick = () => { renderMore(); show('vMore'); };
}
RENDER.vToday = renderToday;

// ── Hub ──
function renderHub() {
  $('vHub').innerHTML = `
  <header class="hero small-hero"><h1>Workouts</h1><p class="dim">Kettlebell sessions to pick from, your own, and the ones your coach sends.</p></header>
  <div class="stack">
    <button type="button" class="hubcard" data-list="library"><b>Workout library</b><span>${LIB.WORKOUTS.length} sessions: EMOM, AMRAP, for time, ladders, complexes</span><i>›</i></button>
    <button type="button" class="hubcard" data-list="mine"><b>My workouts</b><span>${D.custom.length + D.imported.length + bundled.length} saved, built or imported</span><i>›</i></button>
    <button type="button" class="hubcard" data-act="build"><b>Build for me</b><span>Choose time, focus and format. Back-safe when Rehab mode is on.</span><i>›</i></button>
    <button type="button" class="hubcard" data-act="import"><b>Import from coach</b><span>Paste the workout JSON from the coaching chat</span><i>›</i></button>
  </div>`;
  $('vHub').querySelectorAll('[data-list]').forEach(b => b.onclick = () => openList(b.dataset.list));
  $('vHub').querySelector('[data-act="build"]').onclick = openBuilder;
  $('vHub').querySelector('[data-act="import"]').onclick = openImport;
}
RENDER.vHub = renderHub;
let listState = { which: 'library', focus: 'All', q: '' };
function openList(which) { listState.which = which; renderList(); show('vList'); }
function renderList() {
  const s = listState;
  let ws = s.which === 'library' ? LIB.WORKOUTS : [...D.imported, ...bundled, ...D.custom];
  const focuses = ['All', 'From recording', 'Back-safe', 'Full Body', 'Upper Body', 'Legs', 'Core'];
  if (s.focus === 'From recording') ws = ws.filter(w => w.source === 'recording');
  else if (s.focus === 'Back-safe') ws = ws.filter(w => WK.backRating(w) === 'ok');
  else if (s.focus !== 'All') ws = ws.filter(w => w.focus === s.focus);
  if (s.q) ws = ws.filter(w => (w.title + ' ' + w.sections.map(x => WK.lines(x).join(' ')).join(' ')).toLowerCase().includes(s.q.toLowerCase()));
  $('vList').innerHTML = `
  <div class="bar-top"><button class="icon-btn" type="button" data-back aria-label="Back">‹</button><h2>${s.which === 'library' ? 'Workout library' : 'My workouts'}</h2></div>
  <input class="search" type="search" placeholder="Search workout" value="${esc(s.q)}" id="wSearch">
  <div class="chips scroll">${focuses.map(f => `<button type="button" class="chip btn-chip" data-focus="${f}" aria-pressed="${f === s.focus}">${f}</button>`).join('')}</div>
  <p class="mono dim">${ws.length} result${ws.length === 1 ? '' : 's'}</p>
  <div class="stack">${ws.map(w => wCard(w, { date: !!w.date, done: D.sessions.some(x => x.workoutId === w.id) })).join('') || '<p class="note">Nothing here yet. Build one, or import a workout from the coaching chat.</p>'}</div>
  ${s.which === 'mine' ? '<div class="cta"><button class="btn go" type="button" id="mBuild">Build for me</button><button class="btn ghost" type="button" id="mImport">Import</button></div>' : ''}`;
  $('wSearch').oninput = e => { s.q = e.target.value; const pos = e.target.selectionStart; renderList(); const i = $('wSearch'); i.focus(); i.setSelectionRange(pos, pos); };
  $('vList').querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { s.focus = b.dataset.focus; renderList(); });
  $('vList').querySelectorAll('[data-open-w]').forEach(b => b.onclick = () => openWorkout(b.dataset.openW));
  if ($('mBuild')) { $('mBuild').onclick = openBuilder; $('mImport').onclick = openImport; }
}
RENDER.vList = renderList;

// ── Workout detail ──
let cur = null; // { w, tier, program }
function openWorkout(id, opts = {}) {
  const w = typeof id === 'string' ? findWorkout(id) : id;
  if (!w) { toast('That workout isn’t on this phone any more.'); return; }
  const tiered = JSON.stringify(w).includes('"amber"');
  cur = { w, tier: D.settings.rehab && tiered ? 'amber' : 'green', tiered, program: opts.program || null };
  renderWorkout(); show('vWorkout');
}
function renderWorkout() {
  const { w, tier } = cur, ov = WK.overview(w, tier), r = WK.backRating(w);
  const blocked = !backAllowed(r);
  $('vWorkout').innerHTML = `
  <div class="bar-top"><button class="icon-btn" type="button" data-back aria-label="Back">‹</button><h2>${esc(w.title)}</h2></div>
  ${w.weekNote ? `<p class="note">${esc(w.weekNote)}</p>` : ''}
  ${w.description ? `<p class="dim">${esc(w.description)}</p>` : ''}
  <div class="tiles"><div><span class="mono dim">Duration</span><b>${ov.minutes} min</b></div><div><span class="mono dim">Exercises</span><b>${ov.exercises}</b></div><div><span class="mono dim">Rounds</span><b>${ov.rounds}</b></div></div>
  <span class="chips">${backChip(w)}${w.level ? `<span class="chip">${esc(w.level)}</span>` : ''}</span>
  ${blocked ? `<p class="note warn">This one loads your lower back (${esc(BACK_LABEL[r].toLowerCase())}). Rehab mode is on, so wait for the physio’s go-ahead, or pick a back-safe session.</p>` : ''}
  ${cur.tiered ? `<div class="lbl">Check-in</div><div class="setup"><p>${esc((w.checkIn && w.checkIn.question) || 'Bend forward and touch your knees. Any back tightness this morning or yesterday?')}</p>
    <div class="seg"><button type="button" data-tier="green" aria-pressed="${tier === 'green'}">Green · no tightness</button><button type="button" data-tier="amber" aria-pressed="${tier === 'amber'}">Amber · some tightness</button></div></div>` : ''}
  ${(w.rules || []).length ? `<div class="lbl">Rules</div><ul class="rules">${w.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${w.sections.map(s => {
    const t = (s.format || {}).type;
    const g = LIB.GLOSSARY[0].items.find(x => x[0].toLowerCase() === (WK.FORMAT_LABEL[t] || '').toLowerCase());
    return `<section class="part"><div class="part-head"><b>${esc(s.title)}</b><span class="chip">${esc(WK.FORMAT_LABEL[t] || t)}</span></div>
    ${s.description ? `<p class="dim small">${esc(s.description)}</p>` : ''}${g ? `<details><summary>How ${esc(g[0])} works</summary><p class="dim small">${esc(g[1])}</p></details>` : ''}
    ${s.items.map(it => { const ex = WK.exForShown(it, tier); return `<button type="button" class="itemrow" ${ex ? `data-ex="${ex.id}"` : ''}>
      <span class="thumb" ${ex ? `data-thumb="${ex.id}"` : ''}></span><span><b>${esc(WK.repsText(it, tier) || (s.format.scheme ? s.format.scheme.join('-') : ''))}</b> ${esc(WK.nameOf(it, tier))}<br><span class="dim small">${esc([WK.resolve(it.load, tier), it.camera || (ex && ex.camera) ? '📷 camera coach' : ''].filter(Boolean).join(' · '))}</span></span></button>`; }).join('')}</section>`;
  }).join('')}
  <div class="cta sticky"><button class="btn go" type="button" id="startW">Start workout</button>${w.id.startsWith('built-') && !D.custom.some(x => x.id === w.id) ? '<button class="btn ghost" type="button" id="saveW">Save to mine</button>' : ''}${D.custom.some(x => x.id === w.id) || D.imported.some(x => x.id === w.id) ? '<button class="btn ghost" type="button" id="delW">Remove</button>' : ''}</div>`;
  thumbs($('vWorkout'));
  $('vWorkout').querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { cur.tier = b.dataset.tier; renderWorkout(); });
  $('vWorkout').querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openExercise(b.dataset.ex));
  $('startW').onclick = () => { if (blocked && !confirm('This workout loads your lower back and Rehab mode is on. Start it anyway?')) return; startPlayer(cur.w, cur.tier, cur.program); };
  if ($('saveW')) $('saveW').onclick = () => { D.custom.unshift(cur.w); save(); toast('Saved to My workouts.'); renderWorkout(); };
  if ($('delW')) $('delW').onclick = () => { if (!confirm('Remove this workout from your phone?')) return; D.custom = D.custom.filter(x => x.id !== cur.w.id); D.imported = D.imported.filter(x => x.id !== cur.w.id); save(); back(); };
}
RENDER.vWorkout = renderWorkout;

// ── Build for me ──
let built = { minutes: 20, focus: 'Full Body', format: 'emom' };
function openBuilder() {
  const sheet = $('sheet');
  const opt = (k, vals) => vals.map(([v, l]) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${String(built[k]) === String(v)}">${l}</button>`).join('');
  sheet.innerHTML = `<div class="sheet-card"><h2>Build a workout</h2>
    <div class="lbl">Time</div><div class="seg">${opt('minutes', [[10, '10 min'], [15, '15'], [20, '20'], [30, '30'], [40, '40']])}</div>
    <div class="lbl">Focus</div><div class="seg wrap">${opt('focus', [['Full Body', 'Full body'], ['Upper Body', 'Upper'], ['Legs', 'Legs'], ['Core', 'Core'], ['Rehab', 'Rehab']])}</div>
    <div class="lbl">Format</div><div class="seg wrap">${opt('format', [['emom', 'EMOM'], ['amrap', 'AMRAP'], ['circuit', 'Circuit'], ['intervals', '30/30']])}</div>
    <p class="note">${D.settings.rehab ? 'Rehab mode is on, so only back-safe moves are used.' : 'Rehab mode is off, so swings, cleans and squats can appear.'} Loads come from your bells (${D.settings.bells.join(', ')} kg).</p>
    <div class="cta"><button class="btn go" type="button" id="doBuild">Build it</button><button class="btn ghost" type="button" id="closeSheet">Cancel</button></div></div>`;
  sheet.hidden = false;
  sheet.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { built[b.dataset.k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; openBuilder(); });
  $('closeSheet').onclick = () => sheet.hidden = true;
  $('doBuild').onclick = () => { sheet.hidden = true; openWorkout(WK.generate({ ...built, backSafe: D.settings.rehab, bells: D.settings.bells, seed: Date.now() })); };
}
function openImport() {
  const sheet = $('sheet');
  sheet.innerHTML = `<div class="sheet-card"><h2>Import from coach</h2><p class="dim small">In the coaching chat, ask for the session “for the app”. Copy the JSON block and paste it here.</p>
    <textarea id="impText" rows="8" placeholder='{ "schema": "repcoach.workout/v1", … }'></textarea><div id="impErr" class="err" hidden></div>
    <div class="cta"><button class="btn go" type="button" id="doImp">Import</button><button class="btn ghost" type="button" id="closeSheet">Cancel</button></div></div>`;
  sheet.hidden = false;
  $('closeSheet').onclick = () => sheet.hidden = true;
  $('doImp').onclick = () => {
    const r = WK.parse($('impText').value);
    if (!r.ok) { $('impErr').hidden = false; $('impErr').innerHTML = 'Couldn’t import it:<br>' + r.errors.map(esc).join('<br>'); return; }
    D.imported = D.imported.filter(x => x.id !== r.workout.id); D.imported.unshift(r.workout); save();
    sheet.hidden = true; toast(`Imported “${r.workout.title}”.`); openWorkout(r.workout.id);
  };
}

// ── Exercise library ──
let libState = { q: '', cat: 'All' };
function renderLib() {
  const s = libState, cats = ['All', 'Back-safe', 'Camera', 'Full Body', 'Upper Body', 'Legs', 'Core', 'Rehab'];
  let list = LIB.EXERCISES.filter(e => e.id !== 'rest');
  if (s.cat === 'Back-safe') list = list.filter(e => e.back === 'ok');
  else if (s.cat === 'Camera') list = list.filter(e => e.camera);
  else if (s.cat !== 'All') list = list.filter(e => e.cat === s.cat);
  if (s.q) list = list.filter(e => (e.name + ' ' + e.primary + ' ' + e.secondary).toLowerCase().includes(s.q.toLowerCase()));
  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  $('vLib').innerHTML = `<header class="hero small-hero"><h1>Exercises</h1></header>
  <input class="search" type="search" placeholder="Search exercise or muscle" value="${esc(s.q)}" id="exSearch">
  <div class="chips scroll">${cats.map(c => `<button type="button" class="chip btn-chip" data-cat="${c}" aria-pressed="${c === s.cat}">${c}</button>`).join('')}</div>
  <p class="mono dim">Showing ${list.length} · ${clipSet.size} with your own clip</p>
  <div class="stack">${list.map(e => `<button type="button" class="exrow" data-ex="${e.id}"><span class="thumb" data-thumb="${e.id}"></span>
    <span><b>${esc(e.name)}</b><span class="chips"><span class="dot back-${e.back}" title="${BACK_LABEL[e.back]}"></span><span class="dim small">${esc(e.cat)}</span>${e.camera ? '<span class="dim small">· 📷</span>' : ''}${clipSet.has(e.id) ? '<span class="dim small">· clip</span>' : ''}</span></span><i>›</i></button>`).join('')}</div>`;
  thumbs($('vLib'));
  $('exSearch').oninput = e => { s.q = e.target.value; const pos = e.target.selectionStart; renderLib(); const i = $('exSearch'); i.focus(); i.setSelectionRange(pos, pos); };
  $('vLib').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { s.cat = b.dataset.cat; renderLib(); });
  $('vLib').querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openExercise(b.dataset.ex));
}
RENDER.vLib = renderLib;
let curEx = null;
function openExercise(id) { curEx = id; renderExercise(); show('vEx'); }
function renderExercise() {
  const e = LIB.BY_ID[curEx]; if (!e) return;
  const sg = WK.suggest(e.id, D.sessions, D.settings.bells);
  $('vEx').innerHTML = `<div class="bar-top"><button class="icon-btn" type="button" data-back aria-label="Back">‹</button><h2>${esc(e.name)}</h2></div>
  <div class="media" id="exMedia"></div>
  <div class="cta"><button class="btn ghost" type="button" id="addClip">${clipSet.has(e.id) ? 'Replace your clip' : 'Add your clip'}</button><a class="btn ghost" href="${e.demo}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>
  <span class="chips"><span class="chip back-${e.back}">${BACK_LABEL[e.back]}</span><span class="chip">${esc(e.cat)}</span>${e.side ? '<span class="chip">Each side</span>' : ''}</span>
  ${e.back === 'load' ? '<p class="note warn">This loads your lower back. Leave it out until the physio gives you the go-ahead.</p>' : ''}
  <div class="lbl">How to</div><ol class="how">${e.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="lbl">Active muscles</div><div class="muscles">${muscleMap(e)}<div><span class="mono dim">Primary</span><p>${esc(e.primary)}</p><span class="mono dim">Secondary</span><p>${esc(e.secondary)}</p></div></div>
  ${e.mistakes.length ? `<div class="lbl">Common mistakes</div><ol class="how">${e.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
  ${sg ? `<div class="lbl">Next time</div><p class="note">${esc(sg.text)}</p>` : ''}
  ${e.camera ? `<div class="cta"><button class="btn go" type="button" id="exCam">Coach me on camera</button></div>` : ''}
  ${clipSet.has(e.id) ? '<div class="cta"><button class="btn ghost" type="button" id="delClip">Delete your clip</button></div>' : ''}`;
  mountMedia($('exMedia'), e.id);
  $('addClip').onclick = () => openClip(e.id);
  if ($('delClip')) $('delClip').onclick = async () => { if (!confirm('Delete your clip for ' + e.name + '?')) return; await clips.del(e.id); clipSet.delete(e.id); renderExercise(); };
  if ($('exCam')) $('exCam').onclick = () => { window.__repcoach.pick(e.camera); show('home'); };
}
RENDER.vEx = renderExercise;

// Body map: simple front and back outlines, primary muscles bright, secondary dim
const MUSCLE_KEYS = [
  [/shoulder|delt/i, ['delts']], [/chest/i, ['chest']], [/bicep/i, ['biceps']], [/tricep/i, ['triceps']], [/forearm|grip|wrist/i, ['forearms']],
  [/deep abs|abs|core|diaphragm/i, ['abs']], [/oblique/i, ['obliques']], [/quad/i, ['quads']], [/adductor/i, ['adductors']], [/calves|calf|achilles|foot|ankle/i, ['calves']],
  [/shin/i, ['shins']], [/trap/i, ['traps']], [/lat/i, ['lats']], [/upper back|rear shoulder|rotator/i, ['upperback']], [/back extensor|lower back|^back|, back/i, ['lowerback']],
  [/glute|abductor/i, ['glutes']], [/hamstring/i, ['hamstrings']], [/hip flexor|hips/i, ['hipflex']], [/legs|everything/i, ['quads', 'glutes', 'hamstrings']], [/patellar|tendon/i, ['quads']]];
const REG = {
  front: { delts: [[32, 44, 7, 6], [68, 44, 7, 6]], chest: [[42, 52, 8.5, 6.5], [58, 52, 8.5, 6.5]], biceps: [[27, 62, 4.5, 9], [73, 62, 4.5, 9]], forearms: [[24, 84, 4, 10], [76, 84, 4, 10]],
    abs: [[50, 76, 7.5, 13]], obliques: [[39.5, 78, 3.5, 10], [60.5, 78, 3.5, 10]], hipflex: [[43, 96, 5, 4.5], [57, 96, 5, 4.5]], quads: [[42, 120, 6.5, 17], [58, 120, 6.5, 17]],
    adductors: [[47.5, 112, 2.6, 11], [52.5, 112, 2.6, 11]], shins: [[42, 160, 3.5, 13], [58, 160, 3.5, 13]], calves: [[39.5, 160, 2.5, 11], [60.5, 160, 2.5, 11]] },
  back: { traps: [[50, 40, 12, 6]], delts: [[32, 44, 7, 6], [68, 44, 7, 6]], upperback: [[41, 55, 7.5, 7], [59, 55, 7.5, 7]], lats: [[39, 69, 6, 11], [61, 69, 6, 11]], triceps: [[27, 62, 4.5, 9], [73, 62, 4.5, 9]],
    forearms: [[24, 84, 4, 10], [76, 84, 4, 10]], lowerback: [[50, 84, 6.5, 8]], glutes: [[43, 101, 7.5, 8], [57, 101, 7.5, 8]], hamstrings: [[42, 126, 6, 15], [58, 126, 6, 15]],
    calves: [[42, 158, 5, 13], [58, 158, 5, 13]], adductors: [[47.5, 116, 2.4, 9], [52.5, 116, 2.4, 9]] } };
function muscleMap(e) {
  const hits = (txt) => { const s = new Set(); String(txt).split(',').forEach(part => MUSCLE_KEYS.forEach(([re, ids]) => { if (re.test(part.trim())) ids.forEach(i => s.add(i)); })); return s; };
  const pri = hits(e.primary), sec = hits(e.secondary);
  const body = `<circle cx="50" cy="16" r="9"/><rect x="46" y="24" width="8" height="8" rx="3"/><rect x="34" y="34" width="32" height="68" rx="12"/>
    <rect x="21" y="38" width="12" height="34" rx="6"/><rect x="67" y="38" width="12" height="34" rx="6"/><rect x="19" y="70" width="10" height="28" rx="5"/><rect x="71" y="70" width="10" height="28" rx="5"/>
    <rect x="35" y="96" width="14" height="80" rx="7"/><rect x="51" y="96" width="14" height="80" rx="7"/>`;
  const fig = (side) => `<svg viewBox="0 0 100 180" class="bodymap" role="img" aria-label="${side} view"><g class="base">${body}</g>${Object.entries(REG[side]).map(([k, els]) =>
    els.map(([cx, cy, rx, ry]) => `<ellipse class="${pri.has(k) ? 'm1' : sec.has(k) ? 'm2' : 'm0'}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('')).join('')}</svg>`;
  return `<div class="maps">${fig('front')}${fig('back')}</div>`;
}

// ── Clip studio: record or import a short loop ──
let clipFor = null, clipStream = null, recorder = null, chunks = [], pendingBlob = null;
function openClip(id) {
  clipFor = id; pendingBlob = null;
  const e = LIB.BY_ID[id];
  $('vClip').innerHTML = `<div class="bar-top"><button class="icon-btn" type="button" id="clipBack" aria-label="Back">‹</button><h2>Clip · ${esc(e.name)}</h2></div>
  <p class="dim small">Film one or two clean reps from the side, or pick a video from your Photos and trim it. The clip loops silently in the player. It stays on this phone and is never uploaded.</p>
  <div class="media tall" id="clipStage"><video id="clipVid" muted playsinline></video></div>
  <div id="trimBox" hidden><div class="row2"><label class="mono dim">Start <b id="tS">0.0</b> s<input type="range" id="trimStart" min="0" max="10" step="0.1" value="0"></label>
    <label class="mono dim">End <b id="tE">0.0</b> s<input type="range" id="trimEnd" min="0" max="10" step="0.1" value="4"></label></div></div>
  <p class="err" id="clipErr" hidden></p>
  <div class="cta" id="clipCtas">
    <button class="btn go" type="button" id="recBtn">Record</button>
    <label class="btn ghost" for="clipFile" style="text-align:center">Pick a video</label><input type="file" id="clipFile" accept="video/*" hidden>
  </div>
  <div class="cta" id="keepCtas" hidden><button class="btn go" type="button" id="keepClip">Save clip</button><button class="btn ghost" type="button" id="redoClip">Start over</button></div>`;
  show('vClip');
  const v = $('clipVid');
  $('clipBack').onclick = () => { stopClipCam(); openExercise(id); };
  $('recBtn').onclick = async () => {
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    try {
      if (!clipStream) { clipStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 } }, audio: false }); v.srcObject = clipStream; await v.play(); $('recBtn').textContent = 'Start recording'; return; }
      chunks = []; recorder = new MediaRecorder(clipStream, pickMime());
      recorder.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
      recorder.onstop = () => { const blob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' }); stopClipCam(); review(blob); };
      recorder.start(); $('recBtn').textContent = 'Stop'; voice.say('Recording', true);
      setTimeout(() => recorder && recorder.state === 'recording' && recorder.stop(), 12000);
    } catch (err) { clipError(err.name === 'NotAllowedError' ? 'Camera access is blocked. Allow it for this site in Settings, then try again.' : 'Couldn’t start the camera here. Pick a video instead.'); }
  };
  $('clipFile').onchange = ev => { const f = ev.target.files[0]; if (f) review(f, true); ev.target.value = ''; };
  $('redoClip').onclick = () => openClip(id);
  $('keepClip').onclick = keepClip;
}
function pickMime() { for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return { mimeType: t, videoBitsPerSecond: 1500000 }; return {}; }
function stopClipCam() { if (clipStream) clipStream.getTracks().forEach(t => t.stop()); clipStream = null; }
function clipError(t) { $('clipErr').textContent = t; $('clipErr').hidden = false; }
function review(blob, trim) {
  pendingBlob = blob;
  const v = $('clipVid'); v.srcObject = null; v.src = URL.createObjectURL(blob); v.loop = true; v.play().catch(() => {});
  $('clipCtas').hidden = true; $('keepCtas').hidden = false;
  v.onloadedmetadata = () => {
    const d = isFinite(v.duration) ? v.duration : 8;
    const s = $('trimStart'), en = $('trimEnd'); s.max = en.max = d.toFixed(1); en.value = Math.min(d, trim ? 4 : d).toFixed(1); s.value = 0;
    const upd = () => { if (+s.value > +en.value - .5) s.value = Math.max(0, +en.value - .5); $('tS').textContent = (+s.value).toFixed(1); $('tE').textContent = (+en.value).toFixed(1); v.currentTime = +s.value; };
    s.oninput = en.oninput = upd; upd(); $('trimBox').hidden = false;
    v.ontimeupdate = () => { if (v.currentTime >= +en.value) v.currentTime = +s.value; };
  };
}
async function keepClip() {
  const s = +$('trimStart').value, en = +$('trimEnd').value;
  $('keepClip').textContent = 'Saving…'; $('keepClip').disabled = true;
  let blob = pendingBlob, start = s, end = en;
  // Re-encode just the trimmed part at a small size when the browser can; otherwise keep the file with trim points.
  try { const small = await reencode(pendingBlob, s, en); if (small && small.size > 1000) { blob = small; start = 0; end = 0; } } catch (e) {}
  try { await clips.put(clipFor, { blob, start, end, added: new Date().toISOString(), type: blob.type }); clipSet.add(clipFor); toast('Clip saved. It loops wherever this exercise appears.'); openExercise(clipFor); }
  catch (e) { clipError('Couldn’t save the clip on this phone. Storage may be full.'); $('keepClip').disabled = false; $('keepClip').textContent = 'Save clip'; }
}
function reencode(blob, s, e) {
  return new Promise((res) => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return res(null);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(blob);
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'); let rec, parts = [], raf;
    const done = () => { cancelAnimationFrame(raf); v.pause(); if (rec && rec.state === 'recording') rec.stop(); };
    v.onloadedmetadata = async () => {
      const k = Math.min(1, 540 / Math.max(v.videoWidth, v.videoHeight)); cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
      v.currentTime = s; await new Promise(r => v.onseeked = r);
      rec = new MediaRecorder(cv.captureStream(30), { ...pickMime(), videoBitsPerSecond: 900000 });
      rec.ondataavailable = ev => ev.data.size && parts.push(ev.data); rec.onstop = () => res(new Blob(parts, { type: rec.mimeType }));
      rec.start(); await v.play().catch(() => res(null));
      const draw = () => { ctx.drawImage(v, 0, 0, cv.width, cv.height); if (v.currentTime >= e || v.ended) return done(); raf = requestAnimationFrame(draw); }; draw();
    };
    v.onerror = () => res(null); setTimeout(() => { done(); }, (e - s) * 1000 + 4000);
  });
}

// ── Player ──
let PL = null, tickT = 0, wake = null;
function startPlayer(w, tier, program, resume) {
  voice.unlock(); beep(1, 1);
  const steps = WK.timeline(w, tier);
  PL = resume ? { ...resume, steps, w } : { w, tier, program, steps, i: 0, startedAt: Date.now(), log: {}, amrap: 0, missed: {}, pausedFor: 0 };
  PL.paused = false; PL.stepStart = performance.now(); PL.stepEnd = null;
  persist(); show('vPlayer'); enterStep();
  navigator.wakeLock?.request('screen').then(l => wake = l).catch(() => {});
  clearInterval(tickT); tickT = setInterval(tick, 200);
}
function persist() { if (!PL) { D.player = null; save(); return; } D.player = { w: PL.w, tier: PL.tier, program: PL.program, i: PL.i, startedAt: PL.startedAt, log: PL.log, amrap: PL.amrap, missed: PL.missed }; save(); }
function step() { return PL.steps[PL.i]; }
function enterStep() {
  const s = step(); if (!s) return finishPlayer();
  PL.stepStart = performance.now(); PL.stepEnd = s.dur != null ? PL.stepStart + s.dur * 1000 : null; PL.lastBeep = null;
  if (s.kind === 'work') {
    const it = s.items[0];
    const say = s.items.length > 1 ? `${s.label}. ${s.items.map(i => `${i.reps} ${i.name}`).join(', ')}` : `${s.emom || s.interval ? s.label.replace(/·.*$/, '') + '. ' : ''}${it.reps ? it.reps.replace('/side', ' each side').replace(' s', ' seconds') + ' ' : ''}${it.name}${it.side ? ', ' + it.side.toLowerCase() + ' side' : ''}`;
    voice.say(say, true);
  } else if (s.kind === 'rest') voice.say(s.label === 'Switch hands' ? 'Switch hands' : `Rest${s.dur >= 20 ? ' ' + s.dur + ' seconds' : ''}`, true);
  else if (s.kind === 'ready') voice.say(`Get ready. ${s.title}`, true);
  renderPlayer();
}
function nextWork(from, n = 3) { const out = []; for (let k = from + 1; k < PL.steps.length && out.length < n; k++) if (PL.steps[k].kind === 'work') out.push(PL.steps[k]); return out; }
function renderPlayer() {
  const s = step(); if (!s) return;
  const it = s.items[0], workIdx = PL.steps.filter((x, k) => k <= PL.i && x.kind === 'work').length, workTotal = PL.steps.filter(x => x.kind === 'work').length;
  const isRest = s.kind !== 'work';
  const show1 = isRest ? (nextWork(PL.i - 1, 1)[0] || null) : s; // during rest, show what's coming
  const hero = show1 && show1.items[0];
  const nx = nextWork(isRest ? PL.i : PL.i, 3).filter(x => x !== show1);
  const logged = it && PL.log[it.key] ? PL.log[it.key] : null;
  $('vPlayer').innerHTML = `
  <div class="pbar"><button class="icon-btn" type="button" id="pExit" aria-label="Leave workout">‹</button><b>${esc(s.title)}</b>
    <button class="icon-btn" type="button" id="pVoice" aria-label="Voice ${D.settings.voice ? 'on' : 'off'}">${D.settings.voice ? '🔊' : '🔇'}</button></div>
  <div class="clockbar ${isRest ? 'resting' : ''}"><span class="fill" id="pFill"></span><span class="lab">${esc(isRest ? s.label : s.label)}</span><span class="time" id="pTime">0:00</span></div>
  <div class="mono dim center">${workIdx} of ${workTotal} · ${WK.clock((Date.now() - PL.startedAt) / 1000 - (PL.pausedFor || 0))} total</div>
  ${hero ? `<div class="now"><span class="mono">${isRest ? 'Next' : 'Now'}${hero.reps ? ': ' + esc(hero.reps) : ''}${hero.side ? ' · ' + esc(hero.side) : ''}</span>
    <h1>${esc(show1.items.length > 1 ? show1.items.map(x => x.name).join(' + ') : hero.name)}</h1>
    ${hero.load ? `<span class="chip load">${esc(hero.load)}</span>` : ''}</div>` : ''}
  ${show1 && show1.items.length > 1 ? `<ol class="multi">${show1.items.map(x => `<li><b>${esc(x.reps)}</b> ${esc(x.name)}${x.load ? ` <span class="dim">${esc(x.load)}</span>` : ''}</li>`).join('')}</ol>` : ''}
  <div class="media player-media" id="pMedia"></div>
  ${hero && hero.cue ? `<p class="cue-line">${esc(hero.cue)}</p>` : ''}
  ${!isRest && logged && logged.cam && logged.cam.length ? `<p class="note">Camera: ${logged.cam.map(c => `${c.reps} reps, ${c.clean} clean${c.faults.length ? ' · ' + c.faults.join(', ') : ''}`).join(' | ')}</p>` : ''}
  <div class="pactions">
    ${!isRest && s.amrap ? `<button class="btn ghost" type="button" id="pRound">Round done · ${PL.amrap}</button>` : ''}
    ${!isRest && s.emom ? `<button class="btn ghost" type="button" id="pMiss" aria-pressed="${!!PL.missed[PL.i]}">${PL.missed[PL.i] ? 'Marked missed' : 'Missed it'}</button>` : ''}
    ${!isRest && hero && hero.camera && s.items.length === 1 ? `<button class="btn ghost" type="button" id="pCam">📷 Coach this set</button>` : ''}
    ${!isRest && s.dur == null ? `<button class="btn go" type="button" id="pDone">Done ✓</button>` : ''}
  </div>
  ${nx.length ? `<div class="lbl">Next</div><div class="stack">${nx.map(x => `<div class="nextrow"><span class="thumb" ${x.items[0].ex ? `data-thumb="${x.items[0].ex}"` : ''}></span><span><b>${esc(x.items.length > 1 ? x.items.length + ' moves' : x.items[0].reps)}</b> ${esc(x.items.length > 1 ? x.items.map(y => y.name).join(', ') : x.items[0].name)}<br><span class="dim small">${esc(x.label)}</span></span></div>`).join('')}</div>` : ''}
  <div class="pfoot"><button class="btn alt" type="button" id="pPrev">‹ Back</button><button class="btn alt" type="button" id="pPause">${PL.paused ? 'Resume' : 'Pause'}</button><button class="btn alt" type="button" id="pSkip">Skip ›</button></div>`;
  if (hero && hero.ex) mountMedia($('pMedia'), hero.ex); else if ($('pMedia')) $('pMedia').innerHTML = `<div class="rest-big">${isRest ? 'Breathe' : ''}</div>`;
  thumbs($('vPlayer').querySelector('.stack') || document.createElement('div'));
  $('pExit').onclick = () => { if (confirm('Leave the workout? Your place is saved, so you can resume it from Today.')) leavePlayer(false); };
  $('pVoice').onclick = () => { D.settings.voice = !D.settings.voice; save(); renderPlayer(); };
  $('pPause').onclick = togglePause;
  $('pSkip').onclick = () => advance(false);
  $('pPrev').onclick = () => { if (PL.i > 0) { PL.i--; while (PL.i > 0 && step().kind === 'rest') PL.i--; persist(); enterStep(); } };
  if ($('pDone')) $('pDone').onclick = () => advance(true);
  if ($('pRound')) $('pRound').onclick = () => { PL.amrap++; persist(); beep(660); renderPlayer(); };
  if ($('pMiss')) $('pMiss').onclick = () => { PL.missed[PL.i] = !PL.missed[PL.i]; persist(); renderPlayer(); };
  if ($('pCam')) $('pCam').onclick = () => coachThisSet(hero);
  tick();
}
function togglePause() {
  if (!PL.paused) { PL.paused = true; PL.pauseAt = performance.now(); }
  else { const d = performance.now() - PL.pauseAt; PL.paused = false; PL.stepStart += d; if (PL.stepEnd) PL.stepEnd += d; PL.pausedFor = (PL.pausedFor || 0) + d / 1000; }
  renderPlayer();
}
function logDone(s) {
  if (s.kind !== 'work') return;
  s.items.forEach(x => { const L = PL.log[x.key] = PL.log[x.key] || { name: x.name, ex: x.ex, load: x.load, done: 0, missed: 0, cam: [] }; if (s.emom && PL.missed[PL.i]) L.missed++; else L.done++; });
}
function advance(done) {
  const s = step();
  if (done || (s.dur != null && s.kind === 'work' && performance.now() >= PL.stepEnd)) logDone(s);
  PL.i++; persist();
  if (PL.i >= PL.steps.length) return finishPlayer();
  enterStep();
}
function tick() {
  if (!PL || $('vPlayer').hidden) return;
  const s = step(); if (!s) return;
  const now = PL.paused ? PL.pauseAt : performance.now();
  const t = $('pTime'), f = $('pFill'); if (!t) return;
  if (PL.stepEnd) {
    const left = Math.max(0, (PL.stepEnd - now) / 1000);
    t.textContent = WK.clock(Math.ceil(left)); f.style.width = (100 - left / s.dur * 100).toFixed(1) + '%';
    const whole = Math.ceil(left);
    if (!PL.paused && whole <= 3 && whole >= 1 && PL.lastBeep !== whole) { PL.lastBeep = whole; beep(660); }
    if (!PL.paused && left <= 0) { beep(990, 250); advance(false); }
  } else {
    const el = (now - PL.stepStart) / 1000;
    t.textContent = WK.clock(el); f.style.width = '0%';
  }
}
function coachThisSet(hero) {
  const target = parseInt(String(hero.reps).match(/\d+(?=\D*$)/) || String(hero.reps).match(/\d+/) || [8], 10) || 8;
  const ld = WK.parseLoad(hero.load);
  if (!PL.paused) togglePause();
  window.__repcoach.startFromWorkout({ ex: hero.camera, target, load: ld ? ld.kg : 0, onDone: (sess) => {
    const L = PL.log[hero.key] = PL.log[hero.key] || { name: hero.name, ex: hero.ex, load: hero.load, done: 0, missed: 0, cam: [] };
    (sess ? sess.sets : []).forEach(x => L.cam.push({ reps: x.reps, clean: x.clean, faults: x.faults.map(f => f.cue) }));
    persist(); show('vPlayer'); if (PL.paused) togglePause(); renderPlayer();
  } });
}
function leavePlayer(clear) { clearInterval(tickT); try { wake && wake.release(); } catch (e) {} wake = null; speechSynthesis?.cancel?.(); if (clear) { PL = null; D.player = null; save(); } else persist(); openTab('today'); }

// ── Finish ──
let FIN = null;
function finishPlayer() {
  clearInterval(tickT); try { wake && wake.release(); } catch (e) {} wake = null;
  voice.say('Workout done. Well done.', true);
  const dur = Math.round((Date.now() - PL.startedAt) / 1000 - (PL.pausedFor || 0));
  const items = {};
  PL.steps.forEach(s => s.kind === 'work' && s.items.forEach(x => {
    if (items[x.key]) return;
    const L = PL.log[x.key] || { done: 0, missed: 0, cam: [] }, pl = WK.parseLoad(x.load), sg = x.ex ? WK.suggest(x.ex, D.sessions, D.settings.bells) : null;
    items[x.key] = { name: x.name, ex: x.ex, done: L.done, missed: L.missed, cam: L.cam, n: pl ? pl.n : (sg ? sg.n : 1), kg: pl ? pl.kg : null, feel: null, planned: x.load };
  }));
  const emomSteps = PL.steps.filter(s => s.emom), done = emomSteps.filter(s => !PL.missed[PL.steps.indexOf(s)]).length;
  const hasAmrap = PL.steps.some(s => s.amrap), hasFT = PL.steps.some(s => s.fortime);
  FIN = { workoutId: PL.w.id, title: PL.w.title, tier: PL.tier, program: PL.program, startedAt: new Date(PL.startedAt).toISOString(), durationSec: dur, items,
    result: hasAmrap ? `${PL.amrap} rounds` : emomSteps.length ? `${done}/${emomSteps.length} intervals` : hasFT ? `${WK.clock(dur)}` : '', rpe: null, note: '', w: PL.w };
  PL = null; D.player = null; save();
  renderFinish(); show('vFinish');
}
function renderFinish() {
  const f = FIN;
  $('vFinish').innerHTML = `<h1 class="well">Well done!</h1>
  <div class="tiles"><div><span class="mono dim">Duration</span><b>${WK.clock(f.durationSec)}</b></div><div><span class="mono dim">Result</span><b>${esc(f.result || '—')}</b></div></div>
  ${/rounds/.test(f.result) ? `<div class="field"><label class="mono dim" for="fRounds">Rounds, edit if needed</label><input id="fRounds" type="number" inputmode="numeric" value="${parseInt(f.result, 10) || 0}"></div>` : ''}
  <div class="lbl">Log your weights · tap how each felt</div>
  <div class="stack">${Object.entries(f.items).filter(([, x]) => x.ex !== 'rest').map(([k, x]) => `<div class="logrow" data-k="${esc(k)}">
    <span class="thumb" ${x.ex ? `data-thumb="${x.ex}"` : ''}></span>
    <div class="logmain"><b>${esc(x.name)}</b><span class="dim small">${x.done} done${x.missed ? ` · ${x.missed} missed` : ''}${x.cam.length ? ` · 📷 ${x.cam.map(c => c.clean + '/' + c.reps + ' clean').join(', ')}` : ''}</span>
      ${x.kg != null || /kg/.test(x.planned || '') || ['kb', '2kb'].includes((LIB.BY_ID[x.ex] || {}).kit) ? `<div class="kg"><button type="button" data-kg="-1" aria-label="Lighter">−</button><span>${x.n > 1 ? '2×' : ''}${x.kg ?? '—'} kg</span><button type="button" data-kg="1" aria-label="Heavier">+</button><button type="button" class="n" data-n aria-label="One or two bells">${x.n > 1 ? '2 bells' : '1 bell'}</button></div>` : ''}
      <div class="feel">${['easy', 'right', 'hard'].map(v => `<button type="button" data-feel="${v}" aria-pressed="${x.feel === v}">${v === 'right' ? 'About right' : v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div></div>`).join('')}</div>
  <div class="lbl">Overall effort (RPE)</div><div class="seg wrap rpe">${[5, 6, 7, 8, 9, 10].map(n => `<button type="button" data-rpe="${n}" aria-pressed="${f.rpe === n}">${n}</button>`).join('')}</div>
  <div class="field"><label class="mono dim" for="fNote">Note</label><textarea id="fNote" rows="2" placeholder="How did the back feel? Anything to change next time?">${esc(f.note)}</textarea></div>
  <div class="cta"><button class="btn go" type="button" id="fSave">Save workout</button><button class="btn ghost" type="button" id="fDiscard">Don’t save</button></div>`;
  thumbs($('vFinish'));
  $('vFinish').querySelectorAll('.logrow').forEach(row => {
    const x = f.items[row.dataset.k];
    row.querySelectorAll('[data-kg]').forEach(b => b.onclick = () => { const base = x.kg ?? D.settings.bells[1] ?? 12; x.kg = x.kg == null ? base : WK.nextBell(x.kg, ALL_BELLS, +b.dataset.kg); renderFinishKeep(); });
    row.querySelector('[data-n]') && (row.querySelector('[data-n]').onclick = () => { x.n = x.n > 1 ? 1 : 2; renderFinishKeep(); });
    row.querySelectorAll('[data-feel]').forEach(b => b.onclick = () => { x.feel = x.feel === b.dataset.feel ? null : b.dataset.feel; renderFinishKeep(); });
  });
  $('vFinish').querySelectorAll('[data-rpe]').forEach(b => b.onclick = () => { f.rpe = +b.dataset.rpe; renderFinishKeep(); });
  $('fSave').onclick = () => {
    keepInputs();
    const sess = { id: 's' + Date.now(), workoutId: f.workoutId, title: f.title, tier: f.tier, startedAt: f.startedAt, durationSec: f.durationSec, result: f.result, rpe: f.rpe, note: f.note, items: f.items, program: f.program };
    if (!findWorkout(f.workoutId)) D.custom.unshift(f.w); // keep built workouts so "Start again" works
    D.sessions.unshift(sess);
    if (f.program) D.program.done[`${f.program.id}:${f.program.week}:${f.program.i}`] = sess.id;
    save(); FIN = null; openSession(sess.id, true);
  };
  $('fDiscard').onclick = () => { if (confirm('Discard this workout log?')) { FIN = null; openTab('today'); } };
}
function keepInputs() { if (!FIN) return; if ($('fNote')) FIN.note = $('fNote').value; if ($('fRounds')) FIN.result = `${+$('fRounds').value || 0} rounds`; }
function renderFinishKeep() { keepInputs(); const y = window.scrollY; renderFinish(); window.scrollTo(0, y); }

// ── History ──
let histRange = '28d';
function renderHist() {
  const r = WK.inRange(D.sessions, histRange);
  const camCount = (JSON.parse(localStorage.getItem('repcoach-history-v1') || '[]')).length;
  $('vHist').innerHTML = `<header class="hero small-hero"><h1>History</h1></header>
  <div class="chips scroll">${[['7d', '7 days'], ['28d', '28 days'], ['month', 'This month'], ['last', 'Last month']].map(([k, l]) => `<button type="button" class="chip btn-chip" data-range="${k}" aria-pressed="${k === histRange}">${l}</button>`).join('')}</div>
  <div class="tiles"><div><span class="mono dim">Workout time</span><b>${WK.clock(r.seconds)}</b></div><div><span class="mono dim">Workouts</span><b>${r.count}</b></div></div>
  <div class="stack">${r.list.map(s => `<button type="button" class="hubcard" data-sess="${s.id}"><b>${esc(s.title)}</b><span>${new Date(s.startedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · ${WK.clock(s.durationSec)}${s.result ? ' · ' + esc(s.result) : ''}${s.rpe ? ' · RPE ' + s.rpe : ''}</span><i>›</i></button>`).join('') || '<p class="note">No workouts in this range yet. Finish one and it shows here with your weights.</p>'}</div>
  <p class="note">Camera sets (${camCount}) are listed on the Camera tab.</p>`;
  $('vHist').querySelectorAll('[data-range]').forEach(b => b.onclick = () => { histRange = b.dataset.range; renderHist(); });
  $('vHist').querySelectorAll('[data-sess]').forEach(b => b.onclick = () => openSession(b.dataset.sess));
}
RENDER.vHist = renderHist;
let curSess = null;
function openSession(id, fresh) {
  curSess = id; renderSession(fresh);
  if (fresh) { backStack = ['vHist']; show('vSession', { push: false }); } else show('vSession');
}
function renderSession(fresh) {
  const s = D.sessions.find(x => x.id === curSess); if (!s) return;
  $('vSession').innerHTML = `<div class="bar-top"><button class="icon-btn" type="button" data-back aria-label="Back">‹</button><h2>${esc(s.title)}</h2></div>
  ${fresh ? '<p class="note">Saved. Copy the log into the coaching chat so your next session adapts.</p>' : ''}
  <p class="mono dim">${new Date(s.startedAt).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · tier ${esc(s.tier)}</p>
  <div class="tiles"><div><span class="mono dim">Time</span><b>${WK.clock(s.durationSec)}</b></div><div><span class="mono dim">Result</span><b>${esc(s.result || '—')}</b></div>${s.rpe ? `<div><span class="mono dim">RPE</span><b>${s.rpe}</b></div>` : ''}</div>
  <div class="stack">${Object.values(s.items).filter(x => x.ex !== 'rest').map(x => `<div class="nextrow"><span class="thumb" ${x.ex ? `data-thumb="${x.ex}"` : ''}></span><span><b>${esc(x.name)}</b><br><span class="dim small">${x.done} done${x.kg ? ` · ${x.n > 1 ? '2×' : ''}${x.kg} kg` : ''}${x.feel ? ' · ' + x.feel : ''}${x.cam && x.cam.length ? ' · 📷 ' + x.cam.map(c => c.clean + '/' + c.reps + ' clean').join(', ') : ''}</span></span></div>`).join('')}</div>
  ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
  <div class="cta"><button class="btn go" type="button" id="sCopy">Copy log</button><button class="btn ghost" type="button" id="sAgain">Start again</button><button class="btn ghost" type="button" id="sDel">Delete</button></div>`;
  thumbs($('vSession'));
  $('sCopy').onclick = async () => { try { await navigator.clipboard.writeText(WK.logText(s)); toast('Log copied. Paste it into the coaching chat.'); } catch (e) { toast('Couldn’t copy. Long-press to select instead.'); } };
  $('sAgain').onclick = () => openWorkout(s.workoutId);
  $('sDel').onclick = () => { if (!confirm('Delete this workout from your history?')) return; D.sessions = D.sessions.filter(x => x.id !== s.id); for (const [k, v] of Object.entries(D.program.done)) if (v === s.id) delete D.program.done[k]; save(); openTab('hist'); };
}
RENDER.vSession = () => renderSession(false);

// ── Settings and glossary ──
function renderMore() {
  const st = D.settings;
  $('vMore').innerHTML = `<div class="bar-top"><button class="icon-btn" type="button" data-back aria-label="Back">‹</button><h2>Settings</h2></div>
  <div class="setup">
    <label class="switch"><input type="checkbox" id="sRehab" ${st.rehab ? 'checked' : ''}><span><b>Rehab mode</b><br><span class="dim small">Flags workouts that load your lower back, builds back-safe sessions, and picks Amber loads.</span></span></label>
    <label class="switch"><input type="checkbox" id="sCleared" ${st.cleared ? 'checked' : ''}><span><b>Physio has cleared me</b><br><span class="dim small">Unlocks weeks 1–4 of Back to Bells.</span></span></label>
    <label class="switch"><input type="checkbox" id="sVoice" ${st.voice ? 'checked' : ''}><span><b>Voice in the player</b></span></label>
    <label class="switch"><input type="checkbox" id="sBeeps" ${st.beeps ? 'checked' : ''}><span><b>Countdown beeps</b></span></label>
    <div class="field"><label class="mono dim">My bells (kg)</label><div class="seg wrap">${[6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32].map(k => `<button type="button" data-bell="${k}" aria-pressed="${st.bells.includes(k)}">${k}</button>`).join('')}</div></div>
  </div>
  <div class="lbl">Backup</div>
  <div class="cta"><button class="btn ghost" type="button" id="bExport">Back up workouts</button><label class="btn ghost" for="bImport" style="text-align:center">Restore</label><input type="file" id="bImport" accept="application/json" hidden></div>
  <p class="note">The backup holds your workouts, logs and settings, not clips or camera sets. It stays on this phone unless you share it.</p>
  <div class="lbl">Glossary</div>
  ${LIB.GLOSSARY.map(g => `<div class="gloss"><b class="mono dim">${esc(g.group)}</b>${g.items.map(([t, d]) => `<details><summary>${esc(t)}</summary><p class="dim small">${esc(d)}</p></details>`).join('')}</div>`).join('')}`;
  const bind = (id, k) => $(id).onchange = e => { st[k] = e.target.checked; save(); };
  bind('sRehab', 'rehab'); bind('sCleared', 'cleared'); bind('sVoice', 'voice'); bind('sBeeps', 'beeps');
  $('vMore').querySelectorAll('[data-bell]').forEach(b => b.onclick = () => { const k = +b.dataset.bell; st.bells = st.bells.includes(k) ? st.bells.filter(x => x !== k) : [...st.bells, k].sort((a, c) => a - c); if (!st.bells.length) st.bells = [k]; save(); renderMore(); });
  $('bExport').onclick = async () => {
    const blob = new Blob([JSON.stringify({ key: KEY, saved: new Date().toISOString(), data: D }, null, 1)], { type: 'application/json' });
    const name = `rep-coach-workouts-${new Date().toISOString().slice(0, 10)}.json`;
    try { const file = new File([blob], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };
  $('bImport').onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (j.key !== KEY || !j.data) throw new Error('wrong file'); if (!confirm('Replace the workouts, logs and settings on this phone with the backup?')) return; D = { ...DEFAULTS, ...j.data }; save(); toast('Backup restored.'); renderMore(); }
    catch (e) { toast('That file isn’t a Rep Coach workouts backup.'); }
  };
}
RENDER.vMore = renderMore;

// ── Start up ──
async function boot() {
  try { const r = await fetch('workouts/index.json', { cache: 'no-cache' }); if (r.ok) { const idx = await r.json(); bundled = (await Promise.all(idx.workouts.map(x => fetch(x.file).then(y => y.ok ? y.json() : null).catch(() => null)))).filter(w => w && WK.validate(w).ok); } } catch (e) {}
  try { const r = await fetch('clips/index.json', { cache: 'no-cache' }); if (r.ok) bundledClips = (await r.json()).clips || {}; } catch (e) {}
  clipSet = new Set([...(await clips.keys()), ...Object.keys(bundledClips)]);
  const q = new URLSearchParams(location.search);
  if (q.get('tab') === 'camera' || q.get('debug') === 'landmarks') openTab('cam');
  else if (D.player && D.player.w) { openTab('today'); resumeBanner(); }
  else openTab(q.get('tab') || 'today');
}
function resumeBanner() {
  const p = D.player, el = document.createElement('div'); el.className = 'resume';
  el.innerHTML = `<span><b>${esc(p.w.title)}</b> is in progress.</span><button class="btn go" type="button">Resume</button><button class="btn ghost" type="button">Discard</button>`;
  $('vToday').prepend(el);
  const [r, x] = el.querySelectorAll('button');
  r.onclick = () => startPlayer(p.w, p.tier, p.program, { ...p });
  x.onclick = () => { D.player = null; save(); el.remove(); };
}
window.__kb = { get D() { return D; }, get PL() { return PL; }, openWorkout, startPlayer, advance: () => advance(true), show, openTab };
boot();
})();
