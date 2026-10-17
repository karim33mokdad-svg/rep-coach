/* Rep Coach engine — pure logic, no DOM.
 * Input: one frame of 33 MediaPipe Pose landmarks ({x,y,z,visibility}, x/y normalised 0..1, y grows downward)
 * plus a timestamp in ms. Output: rep count, live cues, per-rep fault reports.
 * Runs in the browser (window.RepCoach) and in Node (module.exports) so it can be unit-tested.
 */
(function (root) {
  'use strict';

  // ── Landmark indices (MediaPipe BlazePose) ──
  const P = {
    NOSE: 0, LSH: 11, RSH: 12, LEL: 13, REL: 14, LWR: 15, RWR: 16,
    LHIP: 23, RHIP: 24, LKNE: 25, RKNE: 26, LANK: 27, RANK: 28,
    LHEEL: 29, RHEEL: 30, LFOOT: 31, RFOOT: 32
  };
  const SIDES = {
    L: { sh: P.LSH, el: P.LEL, wr: P.LWR, hip: P.LHIP, kne: P.LKNE, ank: P.LANK },
    R: { sh: P.RSH, el: P.REL, wr: P.RWR, hip: P.RHIP, kne: P.RKNE, ank: P.RANK }
  };

  // ── Geometry ──
  function angle(a, b, c) { // interior angle at b, degrees
    const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
    const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
    if (!m) return 180;
    return Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / m))) * 180 / Math.PI;
  }
  function fromVertical(lower, upper) { // inclination of segment lower→upper away from straight up, degrees 0..180
    return Math.abs(Math.atan2(upper.x - lower.x, lower.y - upper.y) * 180 / Math.PI);
  }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1) }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  // signed distance of point p from line a→c, positive when p is BELOW the line (screen y down)
  function belowLine(p, a, c) {
    const t = (p.x - a.x) / ((c.x - a.x) || 1e-6);
    const yOnLine = a.y + t * (c.y - a.y);
    return p.y - yOnLine;
  }
  function vis(lm, ids) { return ids.reduce((s, i) => s + (lm[i].visibility ?? 1), 0) / ids.length; }
  function pickSide(lm, keys) { // for side-on exercises: the side facing the camera is the more visible one
    const v = s => vis(lm, keys.map(k => SIDES[s][k]));
    return v('L') >= v('R') ? 'L' : 'R';
  }
  function pt(lm, side, key) { return lm[SIDES[side][key]]; }

  // ── Exercise library ──
  // dir 'down': metric starts high, a rep = drop below `bottom`, return above `top`.
  // dir 'up'  : metric starts low,  a rep = rise above `bottom`, return below `top`.
  // `start` is where a descent begins; a descent that turns back before `bottom` is a partial rep.
  // Faults: when 'rep' they judge the whole rep's stats; when 'live' they judge every frame (debounced).
  const EX = {
    squat: {
      name: 'Squat', kit: 'Goblet or bodyweight', view: 'side', bell: 'kb16',
      setup: 'Side-on to the camera, 2.5–3 m away, phone at hip height. Whole body in frame, feet included.',
      need: ['sh', 'hip', 'kne', 'ank'], dir: 'down', start: 150, bottom: 100, top: 160, minRepMs: 600,
      topCue: 'Stand tall', topDetail: 'Did not stand all the way up. Finish each rep with hips and knees locked.', partialCue: 'Deeper', partialDetail: 'Turned around before thigh reached parallel. Sit down between your hips.',
      metrics(lm) {
        const s = pickSide(lm, this.need);
        const hip = pt(lm, s, 'hip'), kne = pt(lm, s, 'kne'), ank = pt(lm, s, 'ank'), sh = pt(lm, s, 'sh');
        const torso = fromVertical(hip, sh), shin = fromVertical(ank, kne);
        // lean is judged against the shins: a torso roughly parallel to the shin is balanced for any limb proportions
        return { primary: angle(hip, kne, ank), torso, shin, lean: torso - shin, thigh: fromVertical(kne, hip), side: s };
      },
      faults: [
        { id: 'chest', when: 'rep', cue: 'Chest up', test: r => r.max.lean > 20 && r.max.torso > 45,
          detail: r => `Torso leaned ${r.max.lean.toFixed(0)}° further forward than your shins (${r.max.torso.toFixed(0)}° from vertical). Brace, sit between your heels, and keep the chest proud. If it keeps happening, tight ankles are the usual cause: try a small plate under the heels.` },
        { id: 'hips', when: 'rep', cue: 'Lead with chest', test: r => (r.ascMax.torso ?? 0) - (r.atPeak.torso ?? 0) > 12,
          detail: r => `On the way up your torso tipped a further ${((r.ascMax.torso ?? 0) - (r.atPeak.torso ?? 0)).toFixed(0)}° forward: the hips rose before the chest, turning the squat into a good-morning that loads the lower back. Drive chest and hips up together.` }
      ]
    },

    pushup: {
      name: 'Push-up', kit: 'Floor or parallettes', view: 'side', bell: 'kb12',
      setup: 'Phone on the floor side-on, about 2 m away. Head to heels must be in frame.',
      need: ['sh', 'el', 'wr', 'hip', 'ank'], dir: 'down', start: 145, bottom: 95, top: 155, minRepMs: 500,
      topCue: 'Arms straight', topDetail: 'Elbows stayed bent at the top. Press all the way to straight arms.', partialCue: 'Lower', partialDetail: 'Elbows did not reach 90°. Chest to fist height every rep.',
      gate: m => m.horizontal, gateCue: 'Get into your plank',
      metrics(lm) {
        const s = pickSide(lm, this.need);
        const sh = pt(lm, s, 'sh'), el = pt(lm, s, 'el'), wr = pt(lm, s, 'wr'), hip = pt(lm, s, 'hip'), ank = pt(lm, s, 'ank');
        const len = dist(sh, ank) || 1;
        return {
          primary: angle(sh, el, wr), line: angle(sh, hip, ank),
          sag: belowLine(hip, sh, ank) / len, // + hips below the shoulder–ankle line, − hips above it
          horizontal: fromVertical(ank, sh) > 50, side: s
        };
      },
      faults: [
        { id: 'sag', when: 'live', cue: 'Hips up', test: m => m.line < 160 && m.sag > 0.03,
          detail: () => 'Hips sagged below the line. Squeeze glutes and brace; a sagging push-up loads the lower back.' },
        { id: 'pike', when: 'live', cue: 'Hips down', test: m => m.line < 160 && m.sag < -0.03,
          detail: () => 'Hips piked above the line. Push the hips down to a straight plank.' }
      ]
    },

    swing: {
      name: 'KB Swing', kit: 'Two-hand or single-arm', view: 'side', bell: 'kb16',
      setup: 'Side-on, 3 m away, phone at hip height. Whole body and the bell in frame.',
      need: ['sh', 'hip', 'kne', 'ank'], dir: 'down', start: 150, bottom: 130, top: 158, minRepMs: 450, postMs: 600,
      partialCue: 'Hips back', partialDetail: 'Backswing too short to load the hips. Hike the bell high between the legs.',
      metrics(lm) {
        const s = pickSide(lm, this.need);
        const sh = pt(lm, s, 'sh'), hip = pt(lm, s, 'hip'), kne = pt(lm, s, 'kne'), ank = pt(lm, s, 'ank');
        return { primary: angle(sh, hip, kne), knee: angle(hip, kne, ank), torso: fromVertical(hip, sh), side: s };
      },
      faults: [
        { id: 'squat', when: 'rep', cue: 'Hinge, don’t squat', test: r => r.min.knee < 120 && r.max.torso < 45,
          detail: r => `Knee bent to ${r.min.knee.toFixed(0)}° with the torso only ${r.max.torso.toFixed(0)}° forward: a squat, not a hinge. Push the hips back to the wall behind you.` },
        { id: 'knees', when: 'rep', cue: 'Less knee', test: r => r.min.knee < 120 && r.max.torso >= 45,
          detail: r => `Knee bent to ${r.min.knee.toFixed(0)}°. Hips travel back, knees only soften.` },
        { id: 'short', when: 'rep', cue: 'Hips back', test: r => r.min.primary > 110,
          detail: r => `Hip only closed to ${r.min.primary.toFixed(0)}°. Shallow hinge, so the glutes never load.` },
        { id: 'low', when: 'rep', cue: 'Shorter backswing', test: r => r.max.torso > 85,
          detail: r => `Torso dropped to ${r.max.torso.toFixed(0)}° from vertical, nearly flat. This is where the lower back takes over.` },
        { id: 'lockout', when: 'post', cue: 'Stand tall', test: r => r.postMax.primary < 165,
          detail: r => `Top position only reached ${r.postMax.primary.toFixed(0)}°. Snap to a standing plank: glutes and abs tight.` }
      ]
    },

    lunge: {
      name: 'Reverse Lunge', kit: 'Bodyweight or rack', view: 'side', bell: 'kb8',
      setup: 'Side-on, 2.5–3 m away, phone at hip height. Step straight back, not across.',
      need: ['sh', 'hip', 'kne', 'ank'], dir: 'down', start: 150, bottom: 105, top: 160, minRepMs: 600,
      topCue: 'Stand tall', topDetail: 'Did not return to standing between reps.', partialCue: 'Knee lower', partialDetail: 'Front knee did not reach about 90°. Back knee to a hand-width off the floor.',
      metrics(lm) {
        const kl = angle(lm[P.LHIP], lm[P.LKNE], lm[P.LANK]), kr = angle(lm[P.RHIP], lm[P.RKNE], lm[P.RANK]);
        const hipM = mid(lm[P.LHIP], lm[P.RHIP]), shM = mid(lm[P.LSH], lm[P.RSH]);
        return { primary: Math.min(kl, kr), torso: fromVertical(hipM, shM) };
      },
      faults: [
        { id: 'lean', when: 'rep', cue: 'Stay tall', test: r => r.max.torso > 25,
          detail: r => `Torso leaned ${r.max.torso.toFixed(0)}°. Keep the chest stacked over the hips.` }
      ]
    },

    press: {
      name: 'Overhead Press', kit: 'KB single or double', view: 'front', bell: 'kb20',
      setup: 'Facing the camera, 2.5 m away, phone at chest height. Arms fully in frame overhead.',
      need: ['sh', 'el', 'wr', 'hip'], dir: 'up', start: 110, bottom: 160, top: 100, minRepMs: 500,
      partialCue: 'Lock it out', partialDetail: 'Elbow did not lock overhead. Finish with the biceps by the ear.',
      metrics(lm) {
        // working arm = the one whose wrist is higher on screen
        const s = lm[P.LWR].y <= lm[P.RWR].y ? 'L' : 'R';
        const sh = pt(lm, s, 'sh'), el = pt(lm, s, 'el'), wr = pt(lm, s, 'wr');
        const shM = mid(lm[P.LSH], lm[P.RSH]), hipM = mid(lm[P.LHIP], lm[P.RHIP]);
        const torsoLen = dist(shM, hipM) || 1;
        return { primary: angle(sh, el, wr), overhead: wr.y < lm[P.NOSE].y, shift: Math.abs(shM.x - hipM.x) / torsoLen, side: s };
      },
      bottomGate: m => m.overhead,
      faults: [
        { id: 'shift', when: 'rep', cue: 'Stay stacked', test: r => r.max.shift > 0.15,
          detail: r => 'Torso shifted sideways under the bell. Squeeze the glutes and the opposite fist; ribs down.' }
      ]
    },

    curl: {
      name: 'Biceps Curl', kit: 'KB or dumbbell', view: 'side', bell: 'kb12',
      setup: 'Side-on, 2 m away, phone at chest height. Working arm nearest the camera.',
      need: ['sh', 'el', 'wr', 'hip'], dir: 'down', start: 130, bottom: 60, top: 145, minRepMs: 600,
      topCue: 'Full extension', topDetail: 'Arm did not straighten at the bottom. Lower all the way to load the full range.', partialCue: 'Full squeeze', partialDetail: 'Curl stopped short. Bring the weight all the way to the shoulder.',
      metrics(lm) {
        const s = pickSide(lm, this.need);
        const sh = pt(lm, s, 'sh'), el = pt(lm, s, 'el'), wr = pt(lm, s, 'wr'), hip = pt(lm, s, 'hip');
        return { primary: angle(sh, el, wr), upperArm: fromVertical(el, sh), torso: fromVertical(hip, sh), side: s };
      },
      faults: [
        { id: 'elbow', when: 'rep', cue: 'Pin your elbows', test: r => r.max.upperArm > 30,
          detail: r => `Upper arm swung ${r.max.upperArm.toFixed(0)}° forward. Elbows stay by your ribs; only the forearm moves.` },
        { id: 'swing', when: 'rep', cue: 'No swinging', test: r => r.max.torso - Math.min(r.min.torso, r.preMin.torso ?? r.min.torso) > 12,
          detail: r => `Torso rocked ${(r.max.torso - Math.min(r.min.torso, r.preMin.torso ?? r.min.torso)).toFixed(0)}°. Lighter bell, strict reps.` }
      ]
    },

    pullup: {
      name: 'Pull-up', kit: 'Bar', view: 'front', bell: 'kb24',
      setup: 'Facing the camera, phone far enough back to see the bar and your hips.',
      need: ['sh', 'el', 'wr'], dir: 'down', start: 140, bottom: 80, top: 155, minRepMs: 600,
      partialCue: 'Chin over the bar', partialDetail: 'Chin did not clear the hands. Drive elbows down to your back pockets.',
      metrics(lm) {
        const el = (angle(lm[P.LSH], lm[P.LEL], lm[P.LWR]) + angle(lm[P.RSH], lm[P.REL], lm[P.RWR])) / 2;
        const wrY = (lm[P.LWR].y + lm[P.RWR].y) / 2;
        return { primary: el, chinOver: lm[P.NOSE].y < wrY, hanging: wrY < Math.min(lm[P.LSH].y, lm[P.RSH].y) };
      },
      gate: m => m.hanging, gateCue: 'Grab the bar',
      bottomGate: m => m.chinOver,
      topCue: 'Full hang', topDetail: 'Did not return to a dead hang. Straighten the arms between reps so every rep is full range.',
      faults: []
    },

    negative: {
      name: 'Pull-up Negative', kit: 'Bar or box', view: 'front', bell: 'kb24',
      setup: 'Facing the camera. Jump or step to the top, then lower for 5 seconds.',
      need: ['sh', 'el', 'wr'], dir: 'down', start: 140, bottom: 80, top: 155, minRepMs: 400,
      partialCue: 'Start higher', partialDetail: 'Start with the chin over the bar.',
      metrics(lm) { return EX.pullup.metrics.call(EX.pullup, lm); },
      gate: m => m.hanging, gateCue: 'Grab the bar',
      tempo: 5,
      faults: [
        { id: 'fast', when: 'post', cue: 'Slower down', test: r => r.returnMs < 3500,
          detail: r => `Lowered in ${(r.returnMs / 1000).toFixed(1)} s. Aim for 5 seconds; the slow lowering is what builds the pull-up.` }
      ]
    },

    plank: {
      name: 'Plank', kit: 'Forearms or hands', view: 'side', bell: 'kb8', hold: true,
      setup: 'Phone on the floor side-on, 2 m away. Head to heels in frame.',
      need: ['sh', 'hip', 'ank'],
      gate: m => m.horizontal, gateCue: 'Get into your plank',
      metrics(lm) { const m = EX.pushup.metrics.call(EX.pushup, lm); return m; },
      faults: [
        { id: 'sag', when: 'live', cue: 'Hips up', test: m => m.line < 162 && m.sag > 0.03, detail: () => 'Hips sagging. Tuck the pelvis, squeeze glutes.' },
        { id: 'pike', when: 'live', cue: 'Hips down', test: m => m.line < 162 && m.sag < -0.03, detail: () => 'Hips too high. Lower to one straight line.' }
      ]
    }
  };

  // ── Session state machine ──
  function createTracker(exId, opts = {}) {
    const ex = EX[exId];
    if (!ex) throw new Error('Unknown exercise ' + exId);
    const alpha = opts.smoothing ?? 0.5;       // EMA weight on the newest frame
    const minVis = opts.minVisibility ?? 0.5;
    const liveHoldMs = opts.liveHoldMs ?? 300;  // live fault must persist this long
    const cueCooldownMs = opts.cueCooldownMs ?? 3500;

    const sgn = ex.dir === 'up' ? -1 : 1;  // work in 'down' space internally
    const T = ex.hold ? null : { start: sgn * ex.start, bottom: sgn * ex.bottom, top: sgn * ex.top };

    const st = {
      phase: 'top', reps: 0, clean: 0, partials: 0, log: [], smooth: null,
      cur: null, post: null, pre: null, lastCue: {}, liveSince: {}, tracking: false,
      holdMs: 0, holdGoodMs: 0, lastT: null, lastRepT: null, events: []
    };

    function emit(e) { st.events.push(e); }
    function cue(id, text, t, detail) {
      if (st.lastCue[id] && t - st.lastCue[id] < cueCooldownMs) return;
      st.lastCue[id] = t;
      emit({ type: 'cue', id, text, detail, t });
    }
    function acc(stats, m) {
      for (const k in m) {
        if (typeof m[k] !== 'number') continue;
        if (!(k in stats.min) || m[k] < stats.min[k]) stats.min[k] = m[k];
        if (!(k in stats.max) || m[k] > stats.max[k]) stats.max[k] = m[k];
      }
    }
    function newStats() { return { min: {}, max: {} }; }

    function finalizeRep(rep, t) {
      const faults = [];
      for (const f of ex.faults || []) {
        if (f.when === 'rep' || f.when === 'post' || f.when === 'pre') {
          try { if (f.test(rep)) faults.push({ id: f.id, cue: f.cue, detail: f.detail(rep) }); } catch (e) { /* missing stat */ }
        }
      }
      for (const id of rep.liveFaults) {
        if (id === 'top') { faults.push({ id: 'top', cue: ex.topCue, detail: ex.topDetail }); continue; }
        const f = ex.faults.find(x => x.id === id);
        if (f && !faults.some(x => x.id === id)) faults.push({ id, cue: f.cue, detail: f.detail(rep) });
      }
      rep.faults = faults;
      if (!faults.length) st.clean++;
      st.log.push(rep);
      emit({ type: 'repJudged', n: rep.n, faults, t });
      if (faults.length) cue('rep-' + faults[0].id, faults[0].cue, t, faults[0].detail);
    }

    function update(lm, t) {
      st.events = [];
      if (!lm || lm.length < 33) { lost(t); return out(); }
      const need = [];
      for (const k of ex.need) { need.push(SIDES.L[k], SIDES.R[k]); }
      // front-view moves need both sides; side-view moves need the visible side
      const vL = vis(lm, ex.need.map(k => SIDES.L[k])), vR = vis(lm, ex.need.map(k => SIDES.R[k]));
      const v = ex.view === 'front' ? Math.min(vL, vR) : Math.max(vL, vR);
      if (v < minVis) { lost(t); return out(); }
      if (!st.tracking) emit({ type: 'tracking', on: true, t });
      st.tracking = true;

      const raw = ex.metrics(lm);
      if (!st.smooth) st.smooth = { ...raw };
      for (const k in raw) {
        if (typeof raw[k] === 'number') st.smooth[k] = alpha * raw[k] + (1 - alpha) * st.smooth[k];
        else st.smooth[k] = raw[k];
      }
      const m = st.smooth;
      const dt = st.lastT == null ? 0 : Math.min(t - st.lastT, 200);
      st.lastT = t;

      if (ex.gate && !ex.gate(m)) {
        cue('gate', ex.gateCue, t);
        if (ex.hold) emit({ type: 'hold', ms: st.holdMs, goodMs: st.holdGoodMs, active: false, t });
        return out(m);
      }

      // live faults (debounced)
      const activeLive = [];
      for (const f of ex.faults || []) {
        if (f.when !== 'live') continue;
        if (f.test(m)) {
          st.liveSince[f.id] = st.liveSince[f.id] ?? t;
          if (t - st.liveSince[f.id] >= liveHoldMs) { activeLive.push(f.id); cue('live-' + f.id, f.cue, t, f.detail(m)); }
        } else delete st.liveSince[f.id];
      }

      if (ex.hold) {
        st.holdMs += dt;
        if (!activeLive.length) st.holdGoodMs += dt;
        emit({ type: 'hold', ms: st.holdMs, goodMs: st.holdGoodMs, active: true, faults: activeLive, t });
        return out(m, activeLive);
      }

      const x = sgn * m.primary;
      // post-rep window: watch the top position (lockout / full extension) until the next descent or timeout
      if (st.post) {
        acc(st.post.statsPost, m); st.post.maxX = Math.max(st.post.maxX, x);
        if (!st.post.topT && x > T.top) st.post.topT = t;
        if (t - st.post.t0 >= (ex.postMs || 1200) || x < T.start) closePost(t);
      }

      if (st.phase === 'top') {
        st.pre = st.pre || newStats(); acc(st.pre, m);
        if (x < T.start) {
          st.phase = 'descent';
          st.cur = { t0: t, stats: newStats(), reached: false, tBottom: null, tPeak: t, xPeak: x, atPeak: { ...m }, asc: newStats(), live: new Set(), preStats: st.pre };
          st.pre = null;
        }
      }
      if (st.phase === 'descent' || st.phase === 'ascent') {
        const c = st.cur; acc(c.stats, m); activeLive.forEach(id => c.live.add(id));
        if (x < c.xPeak) { c.xPeak = x; c.tPeak = t; c.atPeak = { ...m }; c.asc = newStats(); }
        else if (c.reached) acc(c.asc, m); // the way up, measured from the deepest point
        const deepEnough = x < T.bottom && (!ex.bottomGate || ex.bottomGate(m));
        if (deepEnough && !c.reached) { c.reached = true; st.phase = 'ascent'; emit({ type: 'bottom', t }); }
        if (c.reached && x < T.bottom) c.tBottom = t; // still deep: the way up starts when it leaves
        if (x > T.start && (c.reached || x > T.top)) {
          if (c.reached && t - c.t0 >= ex.minRepMs) {
            st.reps++; st.lastRepT = t;
            const rep = { n: st.reps, t0: c.t0, t1: t, tPeak: c.tPeak, downMs: c.tPeak - c.t0, upMs: t - c.tPeak,
              min: { ...c.stats.min }, max: { ...c.stats.max }, preMax: c.preStats ? c.preStats.max : {}, preMin: c.preStats ? c.preStats.min : {}, atPeak: c.atPeak, ascMax: { ...c.asc.max },
              liveFaults: [...c.live] };
            emit({ type: 'rep', n: st.reps, t });
            st.post = { t0: t, rep, statsPost: newStats(), maxX: x };
            acc(st.post.statsPost, m);
          } else if (!c.reached) {
            st.partials++;
            emit({ type: 'partial', t });
            cue('partial', ex.partialCue, t, ex.partialDetail);
          }
          st.phase = 'top'; st.cur = null;
        }
      }
      return out(m, activeLive);
    }

    function closePost(t) {
      const p = st.post; st.post = null;
      const rep = p.rep; rep.postMax = p.statsPost.max; rep.topReached = p.maxX > T.top;
      rep.returnMs = (p.topT || t) - rep.tPeak; // full return from the deepest point to the top
      if (!rep.topReached && ex.topCue && !rep.liveFaults.includes('top')) rep.liveFaults.push('top');
      finalizeRep(rep, t);
    }

    function lost(t) {
      if (st.tracking) emit({ type: 'tracking', on: false, t });
      st.tracking = false;
      cue('frame', 'Step into frame', t);
    }

    function out(m, live) {
      return { reps: st.reps, clean: st.clean, partials: st.partials, phase: st.phase, metrics: m || null,
        live: live || [], events: st.events, tracking: st.tracking, holdMs: st.holdMs, holdGoodMs: st.holdGoodMs,
        lastRepT: st.lastRepT };
    }

    function summary() {
      if (st.post) closePost(st.lastT || 0);
      const tally = {};
      st.log.forEach(r => r.faults.forEach(f => { tally[f.id] = tally[f.id] || { id: f.id, cue: f.cue, n: 0, detail: f.detail }; tally[f.id].n++; }));
      const top = Object.values(tally).sort((a, b) => b.n - a.n);
      const avgDown = st.log.length ? st.log.reduce((s, r) => s + r.downMs, 0) / st.log.length : 0;
      const avgUp = st.log.length ? st.log.reduce((s, r) => s + r.upMs, 0) / st.log.length : 0;
      return { exercise: exId, name: ex.name, reps: st.reps, clean: st.clean, partials: st.partials,
        faults: top, reps_detail: st.log, holdMs: Math.round(st.holdMs), holdGoodMs: Math.round(st.holdGoodMs),
        avgDownMs: Math.round(avgDown), avgUpMs: Math.round(avgUp) };
    }

    return { update, summary, exercise: ex, id: exId };
  }

  const api = { EX, P, SIDES, createTracker, geometry: { angle, fromVertical, belowLine, mid } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RepCoach = api;
})(typeof window !== 'undefined' ? window : globalThis);
