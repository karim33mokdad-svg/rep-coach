// Writes tests/fixtures/sample-squat-synthetic.json: a synthetic recording in the same format the app saves
// with ?debug=landmarks, so the fixture report works before real recordings exist.
// Run: node tests/tools/make-sample-fixture.js
const fs = require('fs');
const path = require('path');
const RC = require('../../coach.js');
// reuse the unit-test pose generators
const src = fs.readFileSync(path.join(__dirname, '..', 'coach.test.js'), 'utf8');
const gen = src.slice(src.indexOf('const rad ='), src.indexOf('const faultIds'));
const { sideStand, sweep } = new Function('P', gen + 'return { sideStand, sweep };')(RC.P);

function record(poses, t0) {
  const tr = RC.createTracker('squat');
  const frames = poses.map((lm, i) => RC.fixture.packFrame(lm, t0 + i * 33));
  for (const f of frames) { const { t, lm } = RC.fixture.unpackFrame(f); tr.update(lm, t); }
  const s = tr.summary();
  return { app: { reps: s.reps, clean: s.clean, partials: s.partials, faults: RC.fixture.faultReps(s) }, frames };
}

const clean = sweep(175, 85, 3, 18, 8).map(k => sideStand({ knee: k, torso: 10 + (175 - k) * 0.3 }));
const faulty = [
  ...sweep(175, 85, 3, 18, 8).slice(0, -45).map(k => sideStand({ knee: k, torso: 10 + (175 - k) * 0.7 })), // 3 chest drops
  ...sweep(175, 125, 1, 18, 8).map(k => sideStand({ knee: k }))                                            // 1 half-depth partial
];
const fx = {
  format: RC.fixture.FORMAT, ex: 'squat', source: 'synthetic', recorded: '2026-10-17T00:00:00.000Z',
  note: 'Synthetic sample: 3 clean squats, then 3 chest drops and 1 half rep',
  sets: [
    { truth: { reps: 3, faults: {} }, ...record(clean, 1000) },
    { truth: { reps: 3, faults: { chest: [1, 2, 3] } }, ...record(faulty, 60000) }
  ]
};
const out = path.join(__dirname, '..', 'fixtures', 'sample-squat-synthetic.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fx));
console.log('wrote', path.relative(process.cwd(), out), (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
