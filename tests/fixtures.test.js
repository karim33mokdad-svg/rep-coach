// Replays recorded landmark streams through the engine and scores them against hand labels.
// Run: node tests/fixtures.test.js            (fails when an exercise misses its target)
//      node tests/fixtures.test.js --report   (prints the report, never fails; use while tuning)
// Fixtures live in tests/fixtures/*.json. Record them in the app with ?debug=landmarks (see docs/TEST_PLAN.md).
const fs = require('fs');
const path = require('path');
const RC = require('../coach.js');
const F = RC.fixture;

const COUNT_TARGET = 0.95, PRECISION_TARGET = 0.80;
const reportOnly = process.argv.includes('--report');
const dir = path.join(__dirname, 'fixtures');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
const pct = v => v == null ? '  —  ' : (v * 100).toFixed(1).padStart(5) + '%';
const list = a => a && a.length ? a.join(',') : '–';

let problems = 0;
const byEx = {};   // ex → { trueReps, absErr, flagged, tp, truthFaulty, clips, sets[] }
const unlabelled = [];

function replay(ex, frames) {
  const tr = RC.createTracker(ex);
  for (const f of frames) { const { t, lm } = F.unpackFrame(f); tr.update(lm, t); }
  return tr.summary();
}

if (!files.length) console.log('No fixtures in tests/fixtures/. Record some with ?debug=landmarks.');

for (const file of files) {
  let fx;
  try { fx = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
  catch (e) { console.log(`✗ ${file}: not valid JSON (${e.message})`); problems++; continue; }
  if (fx.format !== F.FORMAT || !RC.EX[fx.ex] || !Array.isArray(fx.sets)) {
    console.log(`✗ ${file}: not a ${F.FORMAT} file for a known exercise`); problems++; continue;
  }
  if (RC.EX[fx.ex].hold) { console.log(`  ${file}: ${fx.ex} is a hold; hold timing isn't scored yet, skipped`); continue; }
  fx.sets.forEach((set, i) => {
    const where = `${file} set ${i + 1}`;
    if (!set.truth || set.truth.reps == null) { unlabelled.push(where); return; }
    const sum = replay(fx.ex, set.frames || []);
    const got = F.faultReps(sum), truth = set.truth.faults || {};
    const e = byEx[fx.ex] = byEx[fx.ex] || { trueReps: 0, absErr: 0, flagged: 0, tp: 0, truthFaulty: 0, sets: [] };
    e.trueReps += set.truth.reps; e.absErr += Math.abs(sum.reps - set.truth.reps);
    for (const id of new Set([...Object.keys(got), ...Object.keys(truth)])) {
      const g = got[id] || [], t = new Set(truth[id] || []);
      e.flagged += g.length; e.truthFaulty += t.size; e.tp += g.filter(n => t.has(n)).length;
    }
    const drift = set.app && set.app.reps !== sum.reps ? ` (app counted ${set.app.reps} when recorded)` : '';
    e.sets.push(`    ${where}${fx.note ? ' · ' + fx.note : ''}\n      reps ${sum.reps}/${set.truth.reps}${drift} · partials ${sum.partials}` +
      ` · flagged ${Object.entries(got).map(([k, v]) => `${k}:${list(v)}`).join(' ') || 'none'}` +
      ` · labelled ${Object.entries(truth).map(([k, v]) => `${k}:${list(v)}`).join(' ') || 'clean'}`);
  });
}

const exIds = Object.keys(byEx);
if (exIds.length) {
  console.log('\nExercise            Count acc   Fault prec   Fault recall');
  for (const id of exIds) {
    const e = byEx[id];
    const acc = e.trueReps ? 1 - e.absErr / e.trueReps : (e.absErr ? 0 : 1);
    const prec = e.flagged ? e.tp / e.flagged : null, rec = e.truthFaulty ? e.tp / e.truthFaulty : null;
    const ok = acc >= COUNT_TARGET && (prec == null || prec >= PRECISION_TARGET);
    if (!ok) problems++;
    console.log(`${ok ? '✓' : '✗'} ${RC.EX[id].name.padEnd(18)} ${pct(acc)}      ${pct(prec)}       ${pct(rec)}`);
    console.log(e.sets.join('\n'));
  }
  console.log(`\nTargets: count ≥${COUNT_TARGET * 100}% and fault precision ≥${PRECISION_TARGET * 100}% per exercise. Recall is reported, not gated.`);
}
if (unlabelled.length) console.log(`\nNot labelled yet, skipped: ${unlabelled.join('; ')}`);
console.log(`\n${problems ? problems + ' below target or broken' : 'All labelled fixtures meet the targets'}`);
process.exit(problems && !reportOnly ? 1 : 0);
