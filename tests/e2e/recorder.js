// Full-flow test for the ?debug=landmarks recorder: record a set, label it, save it, replay the saved file.
// Run: node tests/e2e/recorder.js   (needs playwright + a local server on 8765, like flow.js)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const path = require('path');
const RC = require(path.join(__dirname, '..', '..', 'coach.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'coach.test.js'), 'utf8');
const gen = src.slice(src.indexOf('const rad ='), src.indexOf('const faultIds'));
const mk = new Function('P', gen + 'return { sideStand, sweep };')(RC.P);

const frames = [];
mk.sweep(175, 85, 3, 30, 12).forEach(k => frames.push(mk.sideStand({ knee: k, torso: 10 + (175 - k) * 0.7 }))); // 3 chest drops
for (let i = 0; i < 4000; i++) frames.push(mk.sideStand({ knee: 175, torso: 5 }));
const fake = `window.Pose = class { constructor(){ this.i=0; } setOptions(){} onResults(cb){ this.cb=cb; } async initialize(){}
  async send(){ await new Promise(r=>setTimeout(r,12)); const work = window.__repcoach && window.__repcoach.phase === 'work'; const f = window.__F[Math.min(work ? this.i++ : this.i, window.__F.length-1)]; this.cb({ poseLandmarks: f }); } };`;

let pass = 0, fail = 0;
const check = (name, ok, info) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && info ? '  → ' + info : ''}`); };

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.speechSynthesis.speak = () => {}; });
  await p.route('**/mp/pose.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.__F=' + JSON.stringify(frames) + ';' + fake }));

  await p.goto('http://localhost:8765/');
  check('debug note hidden in normal mode', await p.isHidden('#debugNote'));

  await p.goto('http://localhost:8765/?debug=landmarks');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('sModel').textContent.includes('ready'));
  check('debug note shown with ?debug=landmarks', await p.isVisible('#debugNote'));
  await p.fill('#target', '3'); await p.fill('#sets', '1');
  await p.click('#startBtn');
  check('live view shows REC', await p.waitForFunction(() => document.getElementById('liveSet').textContent.includes('REC'), null, { timeout: 10000 }).then(() => true, () => false));
  await p.waitForSelector('#recorder:not([hidden])', { timeout: 60000 });
  check('recorder panel shows the app count', (await p.textContent('#recBody')).includes('counted 3'));

  await p.fill('#recReps0', '3'); await p.fill('#recFaults0', 'bogus:1');
  await p.click('#recSave');
  check('unknown fault id is explained', (await p.textContent('#recErr')).includes('isn’t a fault id'));
  await p.fill('#recFaults0', 'chest:all'); await p.fill('#recNote', 'e2e chest drops');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#recSave')]);
  const fx = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  check('file name', /^fixture-squat-.*\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  check('format and labels saved', fx.format === RC.fixture.FORMAT && fx.ex === 'squat' && fx.note === 'e2e chest drops' &&
    fx.sets.length === 1 && fx.sets[0].truth.reps === 3 && JSON.stringify(fx.sets[0].truth.faults) === '{"chest":[1,2,3]}', JSON.stringify(fx.sets[0].truth));
  const tr = RC.createTracker(fx.ex);
  for (const f of fx.sets[0].frames) { const { t, lm } = RC.fixture.unpackFrame(f); tr.update(lm, t); }
  const sum = tr.summary();
  check('replaying the saved frames gives the same count', sum.reps === fx.sets[0].app.reps && sum.reps === 3, `${sum.reps} vs ${fx.sets[0].app.reps}`);
  check('history key unchanged', await p.evaluate(() => JSON.parse(localStorage.getItem('repcoach-history-v1') || '[]').length === 1));
  check('no page errors', !errs.length, errs.join(' | '));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
