/* Rep Coach — workout engine. Pure logic, no DOM, no timers.
 * Turns a repcoach.workout/v1 file into a timeline of steps the player walks through,
 * validates imported files, builds workouts on request, suggests progressions and writes the log text.
 * Runs in the browser (window.RepWorkout) and in Node (module.exports).
 */
(function (root) {
  'use strict';
  const LIB = (typeof module !== 'undefined' && module.exports) ? require('./library.js') : root.RepLib;
  const FORMATS = ['straight', 'circuit', 'emom', 'amrap', 'fortime', 'intervals', 'tabata', 'ladder', 'complex'];
  const FORMAT_LABEL = { straight: 'Sets', circuit: 'Circuit', emom: 'EMOM', amrap: 'AMRAP', fortime: 'For time', intervals: 'Intervals', tabata: 'Tabata', ladder: 'Ladder', complex: 'Complex' };
  const TIERS = ['green', 'amber'];

  // A value given as { green, amber } resolves by tier; a plain value applies to every tier.
  function resolve(v, tier = 'green') {
    if (v && typeof v === 'object' && !Array.isArray(v) && ('green' in v || 'amber' in v)) return tier in v ? v[tier] : v.green;
    return v;
  }
  function exOf(item) { return item.ex ? LIB.BY_ID[item.ex] : null; }
  function nameOf(item, tier) {
    const swap = item.swap && item.swap[tier];
    if (swap) return swap;
    return item.name || (exOf(item) || {}).name || 'Exercise';
  }
  // the library entry behind the name actually shown (a swap may point at another exercise)
  function exForShown(item, tier) {
    const n = nameOf(item, tier).toLowerCase();
    return LIB.EXERCISES.find(e => e.name.toLowerCase() === n) || exOf(item);
  }
  function repsText(item, tier, override) {
    const reps = override != null ? override : resolve(item.reps, tier);
    const side = item.perSide ? '/side' : '';
    if (item.durationSec) return `${item.durationSec} s${side}`;
    if (item.distanceM) return `${item.distanceM} m`;
    if (reps == null || reps === '') return '';
    if (typeof reps === 'number') return `${reps}${side}`;
    return String(reps);
  }

  // ── Validation for pasted workouts ──
  function validate(w) {
    const errors = [];
    const err = (path, msg) => errors.push(`${path}: ${msg}`);
    if (!w || typeof w !== 'object') return { ok: false, errors: ['The workout must be a JSON object, starting with {.'] };
    if (w.schema !== 'repcoach.workout/v1') err('schema', 'must be "repcoach.workout/v1"');
    if (!w.id || typeof w.id !== 'string') err('id', 'is missing (use date-title, like "2026-10-28-pull-skill")');
    if (!w.title) err('title', 'is missing');
    if (w.date && !/^\d{4}-\d{2}-\d{2}$/.test(w.date)) err('date', 'must look like 2026-10-28');
    if (!Array.isArray(w.sections) || !w.sections.length) err('sections', 'must be a list with at least one section');
    else w.sections.forEach((s, i) => {
      const p = `sections[${i}]`;
      if (!s.format || !FORMATS.includes(s.format.type)) err(`${p}.format.type`, `must be one of ${FORMATS.join(', ')}`);
      if (!Array.isArray(s.items) || !s.items.length) err(`${p}.items`, 'must be a list with at least one exercise');
      else s.items.forEach((it, j) => {
        if (!it.name && !it.ex) err(`${p}.items[${j}]`, 'needs a "name"');
        if (it.ex && !LIB.BY_ID[it.ex]) err(`${p}.items[${j}].ex`, `"${it.ex}" isn't in the exercise library`);
      });
      if (s.format && s.format.type === 'ladder' && !Array.isArray(s.format.scheme)) err(`${p}.format.scheme`, 'a ladder needs a scheme, like [5,10,15]');
      if (s.format && s.format.type === 'amrap' && !(s.format.capSec > 0)) err(`${p}.format.capSec`, 'an AMRAP needs a time cap in seconds');
    });
    return { ok: !errors.length, errors };
  }
  function parse(text) {
    let w;
    try { w = JSON.parse(String(text).trim().replace(/^```(?:json)?|```$/g, '')); }
    catch (e) { return { ok: false, errors: ['That isn’t valid JSON. Copy the whole block from the chat, from the first { to the last }.'] }; }
    const v = validate(w);
    return v.ok ? { ok: true, workout: w } : { ok: false, errors: v.errors };
  }

  // ── Timeline ──
  // Step: { kind: 'ready'|'work'|'rest', si, title, format, items:[{key, ex, name, reps, load, cue, camera, demo}],
  //         dur (s) or null for tap-to-advance, round, rounds, interval, intervals, side, amrap }
  function timeline(w, tier = 'green', opts = {}) {
    const steps = [], readySec = opts.readySec ?? 10;
    const view = (s, si, it, idx, extra = {}) => {
      const ex = exForShown(it, tier) || {};
      return { key: `${s.id || si}.${idx}`, ex: ex.id || null, name: nameOf(it, tier), reps: repsText(it, tier, extra.reps),
        load: resolve(it.load, tier) || '', cue: it.cue || '', camera: it.camera || ex.camera || null, demo: it.demo || ex.demo || null,
        side: extra.side || null };
    };
    (w.sections || []).forEach((s, si) => {
      const f = s.format || { type: 'straight' }, type = f.type === 'tabata' ? 'intervals' : f.type;
      const items = s.items || [];
      const base = { si, title: s.title || FORMAT_LABEL[type], format: type, description: s.description || '' };
      const push = st => steps.push({ ...base, ...st });
      const rest = (sec, label) => { if (sec > 0) push({ kind: 'rest', dur: sec, label: label || 'Rest', items: [] }); };
      const timed = ['emom', 'amrap', 'intervals', 'fortime'].includes(type);
      if (timed || si === 0) push({ kind: 'ready', dur: readySec, label: 'Get ready', items: [] });
      if (type === 'straight') {
        items.forEach((it, idx) => {
          const sets = resolve(it.sets, tier) || 1;
          for (let k = 1; k <= sets; k++) {
            const sides = it.perSide && it.durationSec ? ['Right', 'Left'] : [null];
            sides.forEach(sd => push({ kind: 'work', dur: it.durationSec || null, label: `Set ${k} of ${sets}${sd ? ' · ' + sd : ''}`, set: k, sets, items: [view(s, si, it, idx, { side: sd })] }));
            const last = k === sets && idx === items.length - 1;
            if (!last) rest(resolve(it.restSec, tier) ?? 0);
          }
        });
      } else if (type === 'circuit') {
        const rounds = resolve(f.rounds, tier) || 1;
        for (let r = 1; r <= rounds; r++) {
          items.forEach((it, idx) => {
            const sides = it.perSide && it.durationSec ? ['Right', 'Left'] : [null];
            sides.forEach(sd => push({ kind: 'work', dur: it.durationSec || null, label: `Round ${r} of ${rounds}${sd ? ' · ' + sd : ''}`, round: r, rounds, items: [view(s, si, it, idx, { side: sd })] }));
            if (f.restSec && idx < items.length - 1) rest(f.restSec);
          });
          if (r < rounds) rest(f.restAfterRoundSec || 0, 'Round rest');
        }
      } else if (type === 'emom') {
        const rounds = resolve(f.rounds, tier) || 1, iv = f.intervalSec || 60;
        const n = f.rotate ? rounds * items.length : rounds;
        for (let k = 0; k < n; k++) {
          const r = f.rotate ? Math.floor(k / items.length) + 1 : k + 1;
          const its = f.rotate ? [view(s, si, items[k % items.length], k % items.length)] : items.map((it, idx) => view(s, si, it, idx));
          push({ kind: 'work', dur: iv, label: f.rotate ? `Round ${r} · Min ${k + 1}` : `Round ${r} of ${rounds}`, round: r, rounds, interval: k + 1, intervals: n, items: its, emom: true });
        }
      } else if (type === 'amrap') {
        push({ kind: 'work', dur: f.capSec, label: `AMRAP ${Math.round(f.capSec / 60)} min`, amrap: true, items: items.map((it, idx) => view(s, si, it, idx)) });
      } else if (type === 'fortime') {
        const rounds = resolve(f.rounds, tier) || 1;
        for (let r = 1; r <= rounds; r++) items.forEach((it, idx) => push({ kind: 'work', dur: null, label: rounds > 1 ? `Round ${r} of ${rounds}` : 'For time', round: r, rounds, fortime: true, capSec: f.capSec || null, items: [view(s, si, it, idx)] }));
      } else if (type === 'intervals') {
        const rounds = resolve(f.rounds, tier) || (f.type === 'tabata' ? 8 : 1), work = f.workSec || 20, rs = f.restSec ?? 10;
        for (let k = 0; k < rounds; k++) {
          push({ kind: 'work', dur: work, label: `Interval ${k + 1} of ${rounds}`, interval: k + 1, intervals: rounds, items: [view(s, si, items[k % items.length], k % items.length)] });
          if (k < rounds - 1) rest(rs);
        }
      } else if (type === 'ladder') {
        const scheme = f.scheme || [], main = items[0], pair = items.find(it => it.ex === f.pairWith || it.id === f.pairWith) || (items[1] || null);
        scheme.forEach((v, k) => {
          push({ kind: 'work', dur: null, label: `Rung ${k + 1} of ${scheme.length}`, round: k + 1, rounds: scheme.length, items: [view(s, si, main, 0, { reps: v })] });
          if (pair) push({ kind: 'work', dur: null, label: `Rung ${k + 1} of ${scheme.length}`, round: k + 1, rounds: scheme.length, items: [view(s, si, pair, items.indexOf(pair))] });
          if (k < scheme.length - 1) rest(f.restAfterPairSec || 0);
        });
      } else if (type === 'complex') {
        const rounds = resolve(f.rounds, tier) || 1;
        const sided = items.filter(it => it.perSide), plain = items.filter(it => !it.perSide);
        for (let r = 1; r <= rounds; r++) {
          for (const sd of f.perSide ? ['Right', 'Left'] : [null]) {
            push({ kind: 'work', dur: null, label: `Round ${r} of ${rounds}${sd ? ' · ' + sd + ' hand' : ''}`, round: r, rounds, side: sd,
              items: (f.perSide ? sided : items).map(it => view(s, si, it, items.indexOf(it), { side: sd })) });
            if (sd === 'Right') rest(f.sideRestSec || 0, 'Switch hands');
          }
          if (f.perSide) plain.forEach(it => push({ kind: 'work', dur: null, label: `Round ${r} of ${rounds}`, round: r, rounds, items: [view(s, si, it, items.indexOf(it))] }));
          if (r < rounds) rest(f.restAfterRoundSec || 0, 'Round rest');
        }
      }
      if (f.restAfterSec && si < w.sections.length - 1) rest(f.restAfterSec, 'Rest before the next part');
    });
    return steps;
  }
  // estimated minutes: timed steps count fully, tap-to-advance steps count 45 s each
  function estimateMin(steps) { return Math.round(steps.reduce((a, s) => a + (s.dur != null ? s.dur : 45), 0) / 60); }

  // summary card numbers
  function overview(w, tier = 'green') {
    const exIds = new Set(); w.sections.forEach(s => s.items.forEach(it => exIds.add(it.ex || it.name)));
    const rounds = Math.max(...w.sections.map(s => resolve((s.format || {}).rounds, tier) || 1));
    return { exercises: exIds.size, rounds, minutes: w.durationMin || estimateMin(timeline(w, tier)) };
  }
  function lines(section, tier = 'green') { // the "5 rounds · 6-8 Double front squat" list on cards
    return section.items.map(it => `${repsText(it, tier) || '—'} ${nameOf(it, tier)}`.trim());
  }

  // ── Loads and progression ──
  // Parse "2×16 kg" / "16 kg" / "16" into { n, kg }. Text like "1 bell" or "KB deadlift" gives null.
  function parseLoad(t) {
    if (typeof t === 'number') return { n: 1, kg: t };
    const m = String(t || '').match(/(?:(\d)\s*[×x]\s*)?(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+)?\s*kg/i);
    return m ? { n: m[1] ? +m[1] : 1, kg: +m[2] } : null;
  }
  const fmtLoad = l => l ? `${l.n > 1 ? l.n + '×' : ''}${l.kg} kg` : '';
  function nextBell(kg, bells, dir = 1) {
    const s = [...bells].sort((a, b) => a - b);
    if (dir > 0) return s.find(b => b > kg) ?? kg;
    return [...s].reverse().find(b => b < kg) ?? kg;
  }
  // What to do next time, from the latest logged entry for this exercise.
  // feel: 'easy' | 'right' | 'hard' (the tap at the end of a workout). Double progression: reps first, then the bell.
  function suggest(exId, sessions, bells = [8, 12, 16, 20, 24]) {
    for (const s of sessions) {
      const e = Object.values(s.items || {}).find(x => x.ex === exId && x.kg);
      if (!e) continue;
      const l = { n: e.n || 1, kg: e.kg };
      if (e.feel === 'easy') { const up = nextBell(e.kg, bells, 1); return up > e.kg ? { kg: up, n: l.n, text: `Last time ${fmtLoad(l)} felt easy. Move up to ${fmtLoad({ n: l.n, kg: up })}.` } : { kg: e.kg, n: l.n, text: `Last time ${fmtLoad(l)} felt easy. Add reps or slow the tempo; it’s your heaviest bell.` }; }
      if (e.feel === 'hard') return { kg: e.kg, n: l.n, text: `Last time ${fmtLoad(l)} felt hard. Stay there until it feels right.` };
      return { kg: e.kg, n: l.n, text: `Last time ${fmtLoad(l)} felt right. Same bell, one more rep per set.` };
    }
    return null;
  }

  // ── Build a workout on request (no network: picks from the library by rules) ──
  const DEFAULT_REPS = { swing: 15, hinge: 8, squat: 10, lunge: '8/side', clean: '6/side', snatch: '6/side', press: '6/side', floorpress: 10, pushup: 10,
    row: '8/side', hang: 5, curl: 10, getup: '1/side', windmill: '4/side', halo: '5 each way', calf: 10, bridge: 12, deadbug: '8/side', birddog: '6/side', sidelying: '12/side', supine: '5 breaths', stand: 10 };
  const HOLD = { plank: 30, bear: 20, carry: 30, wallsit: 40 };
  function loadFor(e, bells) {
    const usesBell = e.kit === 'kb' || e.kit === '2kb' || (e.kit === 'bench' && ['row', 'curl'].includes(e.pattern));
    if (!usesBell) return null;
    const b = [...bells].sort((a, c) => a - c), pick = i => b[Math.max(0, Math.min(b.length - 1, i))];
    const mid = Math.floor(b.length / 2);
    const kg = ['swing', 'hinge', 'carry'].includes(e.pattern) ? pick(mid) : ['curl', 'halo', 'stand', 'windmill', 'getup'].includes(e.pattern) ? pick(0) : pick(mid - 1);
    return { green: e.kit === '2kb' || e.kit === 'bench' ? `2×${kg} kg` : `${kg} kg` };
  }
  function seeded(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function generate({ minutes = 20, focus = 'Full Body', format = 'emom', backSafe = true, bells = [8, 12, 16, 20, 24], seed = Date.now(), noBar = false } = {}) {
    const rnd = seeded(seed);
    const okBack = e => backSafe ? e.back === 'ok' : true;
    const want = e => e.id !== 'rest' && okBack(e) && !(noBar && e.kit === 'bar') &&
      (focus === 'Full Body' ? true : focus === 'Rehab' ? e.cat === 'Rehab' : e.cat === focus || (focus === 'Core' && e.cat === 'Rehab' && ['deadbug', 'birddog', 'bear', 'carry'].includes(e.pattern)));
    let pool = LIB.EXERCISES.filter(want);
    if (pool.length < 4) pool = LIB.EXERCISES.filter(e => e.id !== 'rest' && okBack(e));
    // spread across patterns: one per pattern first
    const byPattern = {}; pool.forEach(e => (byPattern[e.pattern] = byPattern[e.pattern] || []).push(e));
    const patterns = Object.keys(byPattern).sort(() => rnd() - 0.5);
    const n = format === 'circuit' ? 5 : 4, chosen = [];
    for (let i = 0; chosen.length < n && i < 50; i++) {
      const list = byPattern[patterns[i % patterns.length]]; const e = list[Math.floor(rnd() * list.length)];
      if (!chosen.includes(e)) chosen.push(e);
    }
    const warm = minutes >= 20;
    const mainMin = Math.max(6, minutes - (warm ? 5 : 0));
    const items = chosen.map(e => {
      const it = { ex: e.id, load: loadFor(e, bells) };
      if (HOLD[e.pattern]) { it.durationSec = HOLD[e.pattern]; if (e.side) it.perSide = true; }
      else { const r = DEFAULT_REPS[e.pattern] ?? 10; it.reps = !e.side && /\/side/.test(r) ? parseInt(r, 10) + 2 : r; }
      return it;
    });
    let section;
    if (format === 'amrap') section = { id: 'main', title: `${mainMin} min AMRAP`, format: { type: 'amrap', capSec: mainMin * 60 }, items };
    else if (format === 'intervals') {
      const rounds = Math.max(4, Math.floor(mainMin * 60 / 60)); // 30 on / 30 off
      items.forEach(it => { delete it.reps; delete it.durationSec; delete it.perSide; });
      section = { id: 'main', title: `${rounds} × 30/30`, format: { type: 'intervals', workSec: 30, restSec: 30, rounds }, items };
    } else if (format === 'circuit') {
      const rounds = Math.max(2, Math.round(mainMin / (items.length * 0.9 + 1)));
      section = { id: 'main', title: `${rounds}-round circuit`, format: { type: 'circuit', rounds, restAfterRoundSec: 60 }, items };
    } else {
      const rounds = Math.max(1, Math.floor(mainMin / items.length));
      section = { id: 'main', title: `${rounds * items.length} min EMOM`, format: { type: 'emom', intervalSec: 60, rounds, rotate: true }, items };
    }
    const sections = [];
    if (warm) sections.push({ id: 'warm', title: 'Warm-up', format: { type: 'straight' }, items: [{ ex: 'breathing', reps: '5 breaths', sets: 1 }, { ex: 'deadbug', reps: '6/side', sets: 1 }, { ex: 'birddog', reps: '6/side', sets: 1 }] });
    sections.push(section);
    const d = new Date(seed);
    return { schema: 'repcoach.workout/v1', id: `built-${seed}`, title: `${focus} ${FORMAT_LABEL[format]}`, focus, level: backSafe ? 'Rehab' : 'Intermediate',
      durationMin: minutes, back: backSafe ? 'ok' : (chosen.some(e => e.back === 'load') ? 'load' : 'care'), built: d.toISOString(), sections,
      description: `Built for ${minutes} minutes${backSafe ? ', back-safe moves only' : ''}.` };
  }

  // the riskiest back rating among a workout's exercises (for the Rehab-mode badge)
  function backRating(w) {
    if (w.back) return w.back;
    const order = { ok: 0, care: 1, load: 2 }; let worst = 'ok';
    w.sections.forEach(s => s.items.forEach(it => { const e = exForShown(it, 'green'); if (e && order[e.back] > order[worst]) worst = e.back; }));
    return worst;
  }

  // ── History ──
  function inRange(sessions, range, now = Date.now()) {
    const d = new Date(now);
    const start = range === '7d' ? now - 7 * 864e5 : range === '28d' ? now - 28 * 864e5
      : range === 'month' ? new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      : range === 'last' ? new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime() : 0;
    const end = range === 'last' ? new Date(d.getFullYear(), d.getMonth(), 1).getTime() : Infinity;
    const list = sessions.filter(s => { const t = new Date(s.startedAt).getTime(); return t >= start && t < end; });
    return { list, count: list.length, seconds: list.reduce((a, s) => a + (s.durationSec || 0), 0) };
  }
  const clock = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  function logText(s) {
    const out = [`Rep Coach workout — ${s.workoutId} — ${new Date(s.startedAt).toDateString()} — tier: ${s.tier}`, `${s.title}: ${clock(s.durationSec || 0)}${s.result ? ' · result: ' + s.result : ''}${s.rpe ? ' · RPE ' + s.rpe : ''}`];
    for (const it of Object.values(s.items || {})) {
      let line = `- ${it.name}: ${it.done || 0} set${it.done === 1 ? '' : 's'}${it.kg ? ` @ ${it.n > 1 ? it.n + '×' : ''}${it.kg} kg` : ''}${it.feel ? ' (' + it.feel + ')' : ''}`;
      if (it.cam && it.cam.length) line += ` | camera: ${it.cam.map(c => `${c.reps} reps, ${c.clean} clean${c.faults && c.faults.length ? ', ' + c.faults.join(', ') : ''}`).join('; ')}`;
      if (it.missed) line += ` | missed ${it.missed}`;
      out.push(line);
    }
    if (s.note) out.push(`Note: ${s.note}`);
    return out.join('\n');
  }

  const api = { FORMATS, FORMAT_LABEL, TIERS, resolve, nameOf, exForShown, repsText, validate, parse, timeline, estimateMin, overview, lines,
    parseLoad, fmtLoad, nextBell, suggest, generate, backRating, inRange, clock, logText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RepWorkout = api;
})(typeof window !== 'undefined' ? window : globalThis);
