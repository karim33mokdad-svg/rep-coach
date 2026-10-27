/* Rep Coach — animated demo figure. Shown when you haven't added a real clip for an exercise yet.
 * A side-view figure built from joint directions (degrees, 0 = up, 90 = forward, 180 = down, 270 = back),
 * eased between keyframes and dropped onto the floor so every pose stands, kneels or lies naturally.
 */
(function (root) {
  'use strict';
  const L = { thigh: .25, shin: .25, torso: .30, neck: .07, head: .055, ua: .16, fa: .15 };
  const STAND = { thigh: 180, shin: 180, torso: 0, ua: 180, fa: 180 };
  const P = (o) => ({ ...STAND, ...o });
  // keyframes: [pose, seconds to move into the next one]
  const PATTERNS = {
    stand:  { k: [[P({ ua: 175, fa: 175 }), 1.4], [P({ ua: 185, fa: 185 }), 1.4]] },
    swing:  { bell: 'hand', k: [[P({ torso: 68, thigh: 160, shin: 182, ua: 205, fa: 210 }), .45], [P({ torso: 2, ua: 95, fa: 92 }), .45]] },
    hinge:  { bell: 'hand', k: [[P({ torso: 64, thigh: 158, shin: 186, ua: 180, fa: 180 }), 1.1], [P({ ua: 180, fa: 180 }), 1.1]] },
    squat:  { bell: 'hand', k: [[P({ ua: 165, fa: 20 }), 1.1], [P({ torso: 32, thigh: 98, shin: 208, ua: 150, fa: 40 }), 1.1]] },
    lunge:  { bell: 'hand', anchor: 'foot', k: [[P({ thigh: 168, shin: 182, thigh2: 196, shin2: 192, ua: 165, fa: 20 }), 1.1], [P({ thigh: 95, shin: 182, thigh2: 182, shin2: 268, ua: 165, fa: 20 }), 1.1]] },
    press:  { bell: 'hand', k: [[P({ ua: 168, fa: 12 }), 1], [P({ ua: 2, fa: 0 }), 1]] },
    clean:  { bell: 'hand', k: [[P({ torso: 62, thigh: 160, shin: 184, ua: 200, fa: 205 }), .5], [P({ torso: 0, ua: 168, fa: 12 }), .9]] },
    snatch: { bell: 'hand', k: [[P({ torso: 64, thigh: 160, shin: 184, ua: 205, fa: 208 }), .45], [P({ torso: 0, ua: 60, fa: 40 }), .25], [P({ ua: 0, fa: 0 }), .8]] },
    row:    { bell: 'hand', k: [[P({ torso: 74, thigh: 168, shin: 186, ua: 180, fa: 180 }), .9], [P({ torso: 74, thigh: 168, shin: 186, ua: 250, fa: 182 }), .9]] },
    pushup: { anchor: 'mid', k: [[P({ torso: 80, thigh: 260, shin: 260, ua: 180, fa: 180 }), 1], [P({ torso: 88, thigh: 266, shin: 264, ua: 235, fa: 150 }), 1]] },
    plank:  { anchor: 'mid', k: [[P({ torso: 84, thigh: 264, shin: 264, ua: 180, fa: 92 }), 1.6], [P({ torso: 86, thigh: 265, shin: 265, ua: 180, fa: 92 }), 1.6]] },
    bear:   { anchor: 'mid', k: [[P({ torso: 92, thigh: 180, shin: 268, ua: 180, fa: 180 }), 1.5], [P({ torso: 90, thigh: 178, shin: 266, ua: 180, fa: 180 }), 1.5]] },
    birddog:{ anchor: 'mid', k: [[P({ torso: 90, thigh: 180, shin: 270, ua: 180, fa: 180 }), 1.2], [P({ torso: 90, thigh: 180, shin: 270, ua: 180, fa: 180, ua2: 92, fa2: 92, thigh2: 268, shin2: 270 }), 1.6]] },
    floorpress: { bell: 'hand', anchor: 'mid', k: [[P({ torso: -90, thigh: 35, shin: 160, ua: 140, fa: 0 }), 1], [P({ torso: -90, thigh: 35, shin: 160, ua: 0, fa: 0 }), 1]] },
    supine: { anchor: 'mid', k: [[P({ torso: -90, thigh: 30, shin: 160, ua: 92, fa: 92 }), 2], [P({ torso: -92, thigh: 26, shin: 158, ua: 92, fa: 92 }), 2]] },
    deadbug:{ anchor: 'mid', k: [[P({ torso: -90, thigh: 0, shin: 90, ua: 0, fa: 0 }), 1.2], [P({ torso: -90, thigh: 0, shin: 90, thigh2: 70, shin2: 82, ua: 0, fa: 0, ua2: -78, fa2: -80 }), 1.2]] },
    bridge: { anchor: 'mid', k: [[P({ torso: -90, thigh: 40, shin: 162, ua: 92, fa: 92 }), 1], [P({ torso: -108, thigh: 78, shin: 172, ua: 92, fa: 92 }), 1.4]] },
    sidelying: { anchor: 'mid', k: [[P({ torso: -90, thigh: 120, shin: 215, ua: 90, fa: 90 }), 1], [P({ torso: -90, thigh: 120, shin: 215, thigh2: 70, shin2: 170, ua: 90, fa: 90 }), 1]] },
    calf:   { k: [[P({}), .9], [P({ rise: .035 }), .9]] },
    wallsit:{ wall: true, k: [[P({ thigh: 92, shin: 180, ua: 180, fa: 180 }), 2], [P({ thigh: 92, shin: 180, ua: 178, fa: 178 }), 2]] },
    hang:   { bar: true, anchor: 'hand', k: [[P({ ua: 0, fa: 0, thigh: 182, shin: 184 }), 1.2], [P({ ua: 205, fa: 0, thigh: 175, shin: 186 }), 1.2]] },
    curl:   { bell: 'hand', k: [[P({ ua: 180, fa: 180 }), 1], [P({ ua: 182, fa: 30 }), 1]] },
    carry:  { bell: 'hand', k: [[P({ thigh: 165, shin: 190, thigh2: 195, shin2: 182 }), .55], [P({ thigh: 195, shin: 182, thigh2: 165, shin2: 190 }), .55]] },
    halo:   { bell: 'hand', k: [[P({ ua: 150, fa: 20 }), .7], [P({ ua: 40, fa: -60 }), .7], [P({ ua: -20, fa: 70 }), .7]] },
    windmill: { bell: 'hand', k: [[P({ ua: 0, fa: 0, ua2: 180, fa2: 180 }), 1.4], [P({ torso: 55, thigh: 172, shin: 186, ua: 0, fa: 0, ua2: 182, fa2: 182 }), 1.4]] },
    getup:  { bell: 'hand', anchor: 'mid', k: [[P({ torso: -90, thigh: 30, shin: 160, ua: 0, fa: 0 }), 1.4], [P({ torso: -40, thigh: 60, shin: 165, ua: 0, fa: 0, ua2: 200, fa2: 180 }), 1.4],
      [P({ torso: 0, thigh: 92, shin: 182, thigh2: 180, shin2: 270, ua: 0, fa: 0 }), 1.4], [P({ ua: 0, fa: 0 }), 1.6]] }
  };
  const rad = d => d * Math.PI / 180;
  const dir = (a, len) => ({ x: Math.sin(rad(a)) * len, y: Math.cos(rad(a)) * len }); // y up
  const add = (p, v) => ({ x: p.x + v.x, y: p.y + v.y });
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  function blend(a, b, t) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const fa = a[k] ?? a[k.replace('2', '')] ?? 0, fb = b[k] ?? b[k.replace('2', '')] ?? 0;
      o[k] = lerp(fa, fb, t);
    }
    return o;
  }
  function poseAt(pat, t) {
    const ks = pat.k, total = ks.reduce((a, k) => a + k[1], 0);
    let x = t % total;
    for (let i = 0; i < ks.length; i++) {
      if (x <= ks[i][1]) return blend(ks[i][0], ks[(i + 1) % ks.length][0], ease(x / ks[i][1]));
      x -= ks[i][1];
    }
    return ks[0][0];
  }
  function joints(p) {
    const hip = { x: 0, y: 0 };
    const kne = add(hip, dir(p.thigh, L.thigh)), ank = add(kne, dir(p.shin, L.shin));
    const kne2 = add(hip, dir(p.thigh2 ?? p.thigh, L.thigh)), ank2 = add(kne2, dir(p.shin2 ?? p.shin, L.shin));
    const sh = add(hip, dir(p.torso, L.torso)), neck = add(sh, dir(p.torso, L.neck)), head = add(neck, dir(p.torso, L.head));
    const el = add(sh, dir(p.ua, L.ua)), wr = add(el, dir(p.fa, L.fa));
    const el2 = add(sh, dir(p.ua2 ?? p.ua, L.ua)), wr2 = add(el2, dir(p.fa2 ?? p.fa, L.fa));
    return { hip, kne, ank, kne2, ank2, sh, neck, head, el, wr, el2, wr2 };
  }
  // Each pattern gets a fixed placement (computed once from its first keyframe) so the feet don't slide.
  const place = {};
  function placement(name, pat) {
    if (place[name]) return place[name];
    const j0 = joints(pat.k[0][0]);
    if (pat.anchor === 'hand') { place[name] = { mode: 'hand', ref: j0.wr }; return place[name]; }
    place[name] = { mode: pat.anchor || 'foot', ref: pat.anchor === 'mid' ? { x: (j0.hip.x + j0.sh.x) / 2 } : j0.ank };
    return place[name];
  }
  function draw(canvas, name, t, opts = {}) {
    const pat = PATTERNS[name] || PATTERNS.stand, ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, s = Math.min(H * .7, W * .8) * (opts.scale || 1);
    const p = poseAt(pat, t), j = joints(p), pl = placement(name, pat);
    // drop onto the floor (lowest point at y = 0), keep the anchor still horizontally
    let dx, dy;
    const pts = Object.entries(j).filter(([k]) => k !== 'neck').map(([, v]) => v);
    if (pl.mode === 'hand') { dx = -j.wr.x; dy = -j.wr.y; }
    else {
      const minY = Math.min(...pts.map(q => q.y)) - (pat.anchor === 'mid' ? .03 : 0);
      dy = -minY + (p.rise || 0);
      dx = pl.mode === 'mid' ? -((j.hip.x + j.sh.x) / 2) : -j.ank.x;
      if (pl.mode === 'mid') dx = -pl.ref.x - ((j.hip.x + j.sh.x) / 2 - pl.ref.x) * 0.2;
    }
    const floorY = H * (pl.mode === 'hand' ? .95 : .86), cx = W * (pl.mode === 'foot' ? .5 : .5);
    const X = q => cx + (q.x + dx) * s, Y = q => (pl.mode === 'hand' ? H * .1 : floorY) - (q.y + dy) * s;
    ctx.clearRect(0, 0, W, H);
    const css = getComputedStyle(canvas), ink = css.getPropertyValue('--fig').trim() || '#eef0ea', dim = css.getPropertyValue('--fig-dim').trim() || '#6b717b', bell = css.getPropertyValue('--fig-bell').trim() || '#f3c13a';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // floor, wall, bar
    ctx.strokeStyle = dim; ctx.lineWidth = Math.max(1, s * .006);
    if (pl.mode !== 'hand') { ctx.beginPath(); ctx.moveTo(W * .08, floorY); ctx.lineTo(W * .92, floorY); ctx.stroke(); }
    if (pat.wall) { const wx = X({ x: j.sh.x - .045, y: 0 }); ctx.beginPath(); ctx.moveTo(wx, floorY); ctx.lineTo(wx, H * .08); ctx.stroke(); }
    if (pat.bar) { ctx.lineWidth = s * .014; ctx.beginPath(); ctx.moveTo(W * .2, H * .12); ctx.lineTo(W * .8, H * .12); ctx.stroke(); }
    const seg = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke(); };
    const limb = s * .042, body = s * .06;
    // far side first, dimmer
    seg(j.hip, j.kne2, limb, dim); seg(j.kne2, j.ank2, limb, dim);
    seg(j.sh, j.el2, limb * .85, dim); seg(j.el2, j.wr2, limb * .85, dim);
    if (pat.bell && (p.ua2 != null) && name !== 'windmill') drawBell(ctx, X(j.wr2), Y(j.wr2), s, dim);
    seg(j.hip, j.sh, body, ink); seg(j.sh, j.neck, limb * .8, ink);
    seg(j.hip, j.kne, limb, ink); seg(j.kne, j.ank, limb, ink);
    // foot
    const toe = add(j.ank, dir((p.shin + 90 + 360) % 360 < 180 ? 90 : 90, .055));
    seg(j.ank, toe, limb * .8, ink);
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(j.head), Y(j.head), L.head * s * 1.05, 0, 7); ctx.fill();
    seg(j.sh, j.el, limb * .85, ink); seg(j.el, j.wr, limb * .85, ink);
    if (pat.bell) drawBell(ctx, X(j.wr), Y(j.wr), s, bell, name === 'press' || name === 'squat' || name === 'lunge' || name === 'clean' && p.ua < 180);
  }
  function drawBell(ctx, x, y, s, c, racked) {
    const r = s * .045;
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = s * .012;
    const by = racked ? y : y + r * 1.25;
    ctx.beginPath(); ctx.arc(x, by, r, 0, 7); ctx.fill();
    if (!racked) { ctx.beginPath(); ctx.arc(x, y + r * .15, r * .5, Math.PI, 0); ctx.stroke(); }
  }
  // Start a looping animation; returns a stop function. Respects reduced motion (shows one still frame).
  function start(canvas, name, opts = {}) {
    let raf = 0, t0 = performance.now();
    const fit = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); if (r.width) { canvas.width = r.width * d; canvas.height = r.height * d; } };
    fit();
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = now => { draw(canvas, name, (now - t0) / 1000 * (opts.speed || 1), opts); if (!still) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
  function still(canvas, name, t = .9) { const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); if (r.width) { canvas.width = r.width * d; canvas.height = r.height * d; } draw(canvas, name, t); }
  root.RepDemo = { PATTERNS, draw, start, still };
})(typeof window !== 'undefined' ? window : globalThis);
