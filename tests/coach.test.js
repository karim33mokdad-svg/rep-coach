// Synthetic-pose tests for the Rep Coach engine. Run: node tests/coach.test.js
const RC = require('../coach.js');
const { P } = RC;
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info ? '  → ' + info : '')); } }

const rad = d => d * Math.PI / 180;
function blank(v = 0.95) { return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: v })); }
function set(lm, i, p, v = 0.95) { lm[i] = { x: p.x, y: p.y, z: 0, visibility: v }; }
// walk from point p along direction `deg` (0 = straight up, +ve = toward +x) for length len
function go(p, deg, len) { return { x: p.x + Math.sin(rad(deg)) * len, y: p.y - Math.cos(rad(deg)) * len }; }

// Side view, left side to camera. kneeAngle/hipAngle measured like the engine does.
function sideStand({ knee = 175, torso = 5, armDeg = 180, elbow = 175, visL = 0.95, visR = 0.3 }) {
  const lm = blank(visR);
  const ank = { x: 0.5, y: 0.9 };
  const shinDeg = (180 - knee) / 2;          // shin leans forward
  const kne = go(ank, shinDeg, 0.2);
  const thighDeg = shinDeg - (180 - knee);   // thigh leans back by the remaining bend
  const hip = go(kne, thighDeg, 0.2);
  const sh = go(hip, torso, 0.25);
  const el = go(sh, armDeg, 0.13);
  const wr = go(el, armDeg + (180 - elbow), 0.13);
  for (const [i, p] of [[P.LANK, ank], [P.LKNE, kne], [P.LHIP, hip], [P.LSH, sh], [P.LEL, el], [P.LWR, wr]]) set(lm, i, p, visL);
  for (const [i, p] of [[P.RANK, ank], [P.RKNE, kne], [P.RHIP, hip], [P.RSH, sh], [P.REL, el], [P.RWR, wr]]) set(lm, i, p, visR);
  set(lm, P.NOSE, go(sh, torso, 0.08), visL);
  return lm;
}
// Side view plank / push-up: body near horizontal, feet at right, head at left.
function sidePlank({ elbow = 170, sag = 0 }) { // sag: +ve hips drop (screen units)
  const lm = blank(0.3);
  const ank = { x: 0.85, y: 0.8 };
  const upperArm = 0.12, fore = 0.12;
  const sh = { x: 0.3, y: 0.8 - (upperArm + fore) * Math.sin(rad(elbow / 2)) * 1.0 };
  const hip = { x: (sh.x + ank.x) / 2, y: (sh.y + ank.y) / 2 + sag };
  const wr = { x: sh.x, y: 0.8 };
  const el = { x: sh.x + Math.cos(rad(elbow / 2)) * upperArm, y: (sh.y + wr.y) / 2 };
  for (const [i, p] of [[P.LANK, ank], [P.LHIP, hip], [P.LSH, sh], [P.LEL, el], [P.LWR, wr], [P.LKNE, { x: (hip.x + ank.x) / 2, y: (hip.y + ank.y) / 2 }]]) set(lm, i, p, 0.95);
  return lm;
}
// Front view arms: elbow angle both sides, wrists above/below nose
function frontArms({ elbow = 90, up = true, hang = false }) {
  const lm = blank(0.95);
  const nose = { x: 0.5, y: 0.3 }, lsh = { x: 0.4, y: 0.4 }, rsh = { x: 0.6, y: 0.4 };
  set(lm, P.NOSE, nose); set(lm, P.LSH, lsh); set(lm, P.RSH, rsh);
  set(lm, P.LHIP, { x: 0.42, y: 0.7 }); set(lm, P.RHIP, { x: 0.58, y: 0.7 });
  const dirSign = up || hang ? 0 : 180;
  for (const [sh, e, w, s] of [[lsh, P.LEL, P.LWR, -1], [rsh, P.REL, P.RWR, 1]]) {
    const el = go(sh, dirSign + s * 20, 0.12);
    const wr = go(el, dirSign + s * 20 - s * (180 - elbow), 0.12);
    set(lm, e, el); set(lm, w, wr);
  }
  return lm;
}
// Pull-up: hands fixed on bar above, body moves. elbow from 170 (hang) to 50 (top)
function pullFrame(elbow) {
  const lm = blank(0.95);
  const lwr = { x: 0.38, y: 0.15 }, rwr = { x: 0.62, y: 0.15 };
  const rise = (170 - elbow) / 120 * 0.24;   // body rises as elbows bend
  const lsh = { x: 0.42, y: 0.42 - rise }, rsh = { x: 0.58, y: 0.42 - rise };
  const half = (180 - elbow) / 2;
  set(lm, P.LWR, lwr); set(lm, P.RWR, rwr); set(lm, P.LSH, lsh); set(lm, P.RSH, rsh);
  // place elbows so the angle sh-el-wr ≈ elbow
  const bend = (a, b, s) => { const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; const d = Math.hypot(a.x - b.x, a.y - b.y); const off = d / 2 / Math.tan(rad(elbow / 2)); return { x: m.x + s * off, y: m.y }; };
  set(lm, P.LEL, bend(lsh, lwr, -1)); set(lm, P.REL, bend(rsh, rwr, 1));
  set(lm, P.NOSE, { x: 0.5, y: lsh.y - 0.08 });
  set(lm, P.LHIP, { x: 0.44, y: lsh.y + 0.3 }); set(lm, P.RHIP, { x: 0.56, y: rsh.y + 0.3 });
  return lm;
}

function run(ex, frames, opts) {
  const tr = RC.createTracker(ex, opts);
  let t = 0, last, events = [];
  for (const f of frames) { last = tr.update(f, t); events.push(...last.events); t += 33; }
  return { tr, last, sum: tr.summary(), events };
}
// sweep a parameter: hold, go to target, come back, hold — n reps
function sweep(from, to, n, framesEach = 24, holdFrames = 10) {
  const out = [];
  for (let r = 0; r < n; r++) {
    for (let i = 0; i < holdFrames; i++) out.push(from);
    for (let i = 0; i <= framesEach; i++) out.push(from + (to - from) * i / framesEach);
    for (let i = 0; i <= framesEach; i++) out.push(to + (from - to) * i / framesEach);
  }
  for (let i = 0; i < 45; i++) out.push(from);
  return out;
}
const faultIds = s => s.faults.map(f => f.id);

console.log('Squat');
{ const r = run('squat', sweep(175, 85, 5).map(k => sideStand({ knee: k, torso: 10 + (175 - k) * 0.3 })));
  check('5 deep reps counted', r.sum.reps === 5, JSON.stringify({ reps: r.sum.reps, partials: r.sum.partials }));
  check('all 5 clean', r.sum.clean === 5, JSON.stringify(faultIds(r.sum))); }
{ const r = run('squat', sweep(175, 125, 3).map(k => sideStand({ knee: k })));
  check('shallow squats not counted', r.sum.reps === 0);
  check('shallow squats flagged as partial ×3', r.sum.partials === 3, r.sum.partials);
  check('cue "Deeper" spoken', r.events.some(e => e.type === 'cue' && e.text === 'Deeper')); }
{ const r = run('squat', sweep(175, 85, 3).map(k => sideStand({ knee: k, torso: 10 + (175 - k) * 0.7 })));
  check('chest-drop squats counted', r.sum.reps === 3);
  check('flagged "Chest up"', faultIds(r.sum).includes('chest'), JSON.stringify(faultIds(r.sum))); }
{ const fr = [];
  for (let n = 0; n < 3; n++) { for (const k of sweep(156, 85, 1, 24, 6).slice(0, -45)) fr.push(sideStand({ knee: k })); }
  for (let i = 0; i < 60; i++) fr.push(sideStand({ knee: 156 }));
  const r = run('squat', fr);
  check('reps that never stand tall still count', r.sum.reps === 3, r.sum.reps);
  check('flagged "Stand tall"', faultIds(r.sum).includes('top'), JSON.stringify(faultIds(r.sum))); }

{ // bodyweight squat, torso leaning with the shins (≈55° at the bottom): normal, must stay clean
  const r = run('squat', sweep(175, 85, 5).map(k => sideStand({ knee: k, torso: (180 - k) / 2 + 8 })));
  check('bodyweight lean parallel to shins counted', r.sum.reps === 5, r.sum.reps);
  check('bodyweight lean parallel to shins stays clean', r.sum.clean === 5, JSON.stringify(faultIds(r.sum))); }
{ // hips shoot up first: torso tips a further ~20° forward early in the ascent
  const fr = [];
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 10; i++) fr.push(sideStand({ knee: 175, torso: 5 }));
    for (let i = 0; i <= 24; i++) { const k = 175 - 90 * i / 24; fr.push(sideStand({ knee: k, torso: (180 - k) / 2 + 5 })); }
    for (let i = 0; i <= 24; i++) { const k = 85 + 90 * i / 24; const p = Math.min(1, i / 14); const torso = i <= 14 ? 52.5 + 18 * Math.sin(Math.PI * p) : 52.5 * (24 - i) / 10 + 5 * (i - 14) / 10; fr.push(sideStand({ knee: k, torso })); }
  }
  for (let i = 0; i < 45; i++) fr.push(sideStand({ knee: 175, torso: 5 }));
  const r = run('squat', fr);
  check('hips-first squats counted', r.sum.reps === 3, r.sum.reps);
  check('flagged "Lead with chest"', faultIds(r.sum).includes('hips'), JSON.stringify(faultIds(r.sum))); }

console.log('KB swing');
{ // good hinge: hip closes to ~95 with soft knee and torso ~70° forward
  const fr = sweep(178, 95, 6, 14, 6).map(h => sideStand({ knee: 165, torso: (178 - h) * 0.85 + 2 }));
  const r = run('swing', fr);
  check('6 hinges counted', r.sum.reps === 6, r.sum.reps);
  check('hinge swings clean', r.sum.clean === 6, JSON.stringify(faultIds(r.sum))); }
{ // squatted swing: knees bend a lot, torso stays upright
  const fr = sweep(0, 1, 4, 14, 6).map(p => sideStand({ knee: 175 - p * 80, torso: 5 + p * 30 }));
  const r = run('swing', fr);
  check('squatty swings counted', r.sum.reps === 4, r.sum.reps);
  check('flagged "Hinge, don’t squat"', faultIds(r.sum).includes('squat'), JSON.stringify(faultIds(r.sum))); }
{ // never locks out: top only reaches ~158° hip
  const fr = sweep(0, 1, 4, 14, 6).map(p => sideStand({ knee: 165, torso: 22 + p * 60 }));
  const r = run('swing', fr);
  check('soft-top swings flagged "Stand tall"', faultIds(r.sum).includes('lockout'), JSON.stringify(faultIds(r.sum))); }

console.log('Push-up');
{ const r = run('pushup', sweep(170, 80, 5).map(e => sidePlank({ elbow: e })));
  check('5 push-ups counted', r.sum.reps === 5, r.sum.reps);
  check('clean with straight body', r.sum.clean === 5, JSON.stringify(faultIds(r.sum))); }
{ const r = run('pushup', sweep(170, 80, 4).map(e => sidePlank({ elbow: e, sag: 0.06 })));
  check('sagging push-ups flagged "Hips up"', faultIds(r.sum).includes('sag'), JSON.stringify(faultIds(r.sum)));
  check('live cue fired', r.events.some(e => e.type === 'cue' && e.text === 'Hips up')); }
{ const r = run('pushup', sweep(170, 80, 4).map(e => sideStand({ elbow: e, armDeg: 150 })));
  check('arm bends while standing do not count', r.sum.reps === 0, r.sum.reps); }

console.log('Overhead press');
{ const fr = sweep(80, 172, 5).map(e => frontArms({ elbow: e, up: true }));
  const r = run('press', fr);
  check('5 presses counted', r.sum.reps === 5, r.sum.reps + ' partials ' + r.sum.partials); }
{ const fr = sweep(80, 140, 3).map(e => frontArms({ elbow: e, up: true }));
  const r = run('press', fr);
  check('half presses flagged "Lock it out"', r.sum.reps === 0 && r.sum.partials === 3, JSON.stringify({ reps: r.sum.reps, p: r.sum.partials })); }

console.log('Pull-up and negatives');
{ const r = run('pullup', sweep(170, 50, 3, 30).map(pullFrame));
  check('3 pull-ups counted', r.sum.reps === 3, r.sum.reps + ' partials ' + r.sum.partials);
  check('full-range pull-ups clean', r.sum.clean === 3, JSON.stringify(faultIds(r.sum))); }
{ // negative: snap to top fast, lower over N frames
  const neg = (lowerFrames) => { const fr = []; for (let n = 0; n < 3; n++) { for (let i = 0; i < 10; i++) fr.push(170); for (let i = 0; i <= 6; i++) fr.push(170 - 120 * i / 6); for (let i = 0; i < 10; i++) fr.push(50); for (let i = 0; i <= lowerFrames; i++) fr.push(50 + 120 * i / lowerFrames); } for (let i = 0; i < 45; i++) fr.push(170); return fr.map(pullFrame); };
  const slow = run('negative', neg(170)), fast = run('negative', neg(30));
  check('slow negatives counted', slow.sum.reps === 3, slow.sum.reps);
  check('5-second negatives clean', slow.sum.clean === 3, JSON.stringify(faultIds(slow.sum)) + ' returnMs ' + slow.sum.reps_detail.map(r=>r.returnMs));
  check('1-second negatives flagged "Slower down"', faultIds(fast.sum).includes('fast'), JSON.stringify(faultIds(fast.sum))); }

console.log('Curl');
{ const r = run('curl', sweep(170, 45, 4).map(e => sideStand({ elbow: e, armDeg: 180 })));
  check('4 curls counted', r.sum.reps === 4, r.sum.reps + ' partials ' + r.sum.partials);
  check('strict curls clean', r.sum.clean === 4, JSON.stringify(faultIds(r.sum))); }
{ const r = run('curl', sweep(0, 1, 3).map(p => sideStand({ elbow: 170 - p * 125, armDeg: 180 - p * 50, torso: 5 + p * 15 })));
  check('cheated curls flagged elbow + swing', faultIds(r.sum).includes('elbow') && faultIds(r.sum).includes('swing'), JSON.stringify(faultIds(r.sum))); }

console.log('Plank hold');
{ const fr = Array.from({ length: 300 }, () => sidePlank({ elbow: 90 }));
  const r = run('plank', fr);
  check('≈10 s of good plank timed', r.sum.holdGoodMs > 9000 && r.sum.holdGoodMs <= r.sum.holdMs, r.sum.holdGoodMs); }
{ const fr = Array.from({ length: 300 }, (_, i) => sidePlank({ elbow: 90, sag: i > 150 ? 0.07 : 0 }));
  const r = run('plank', fr);
  check('sagging half not counted as good time', r.sum.holdGoodMs < r.sum.holdMs * 0.6, r.sum.holdGoodMs + '/' + r.sum.holdMs); }

console.log('Tracking');
{ const fr = sweep(175, 85, 2).map(k => sideStand({ knee: k, visL: 0.2, visR: 0.2 }));
  const r = run('squat', fr);
  check('no counting when body not visible', r.sum.reps === 0);
  check('cue "Step into frame"', r.events.some(e => e.type === 'cue' && e.text === 'Step into frame')); }
{ // jitter robustness: add noise to good squats
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5);
  const fr = sweep(175, 85, 5).map(k => { const lm = sideStand({ knee: k, torso: 15 }); lm.forEach(p => { p.x += rnd() * 0.012; p.y += rnd() * 0.012; }); return lm; });
  const r = run('squat', fr);
  check('noisy landmarks still give exactly 5 reps', r.sum.reps === 5, r.sum.reps + ' partials ' + r.sum.partials); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
