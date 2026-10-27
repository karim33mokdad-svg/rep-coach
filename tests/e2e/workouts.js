// Kettlebell training flow: Today → workout → player (timers, Done, Skip, camera hand-off) → finish → history → resume → import.
// Run: node tests/e2e/workouts.js   (needs playwright + a local server on 8765, like flow.js)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path'), fs = require('fs');
const RC = require(path.join(__dirname, '..', '..', 'coach.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'coach.test.js'), 'utf8');
const gen = src.slice(src.indexOf('const rad ='), src.indexOf('const faultIds'));
const mk = new Function('P', gen + 'return { sideStand, sweep };')(RC.P);
const frames = [];
for (let i = 0; i < 20; i++) frames.push(mk.sideStand({ knee: 175, torso: 5 }));
mk.sweep(175, 85, 4, 30, 12).forEach(k => frames.push(mk.sideStand({ knee: k, torso: 10 + (175 - k) * 0.3 })));
for (let i = 0; i < 4000; i++) frames.push(mk.sideStand({ knee: 175, torso: 5 }));
const fake = `window.Pose = class { constructor(){ this.i=0; } setOptions(){} onResults(cb){ this.cb=cb; } async initialize(){}
  async send(){ await new Promise(r=>setTimeout(r,12)); const work = window.__repcoach && window.__repcoach.phase === 'work'; const f = window.__F[Math.min(work ? this.i++ : this.i, window.__F.length-1)]; this.cb({ poseLandmarks: f }); } };`;
let pass = 0, fail = 0;
const check = (name, ok, info) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && info ? '  → ' + info : ''}`); };
const OUT = process.env.SHOTS;
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(() => { window.__said = []; window.speechSynthesis.speak = u => window.__said.push(u.text); });
  await p.route('**/mp/pose.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.__F=' + JSON.stringify(frames) + ';' + fake }));
  await p.route('https://fonts.googleapis.com/**', r => r.abort());
  const shot = async n => { if (OUT) { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, n + '.png') }); } };
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('#vToday .day');
  check('Today shows the Back to Bells program', (await p.textContent('#vToday h1')).includes('Back to Bells'));
  check('Week 0 day 1 is marked next', await p.isVisible('#vToday .day.next'));
  check('the bundled 18 Oct session is listed from the coach', (await p.textContent('#vToday')).includes('KB Power'));

  // play Week 0 · Day 4 (Seated Pump EMOM: 16 one-minute intervals)
  await p.click('#vToday [data-day="3"]'); await p.waitForSelector('#startW');
  await shot('w-detail');
  await p.click('#startW'); await p.waitForSelector('#vPlayer .clockbar');
  check('player opens on Get ready', (await p.textContent('#vPlayer .clockbar')).includes('Get ready'));
  await p.waitForTimeout(1300);
  const t1 = await p.textContent('#pTime');
  check('ready countdown runs', /0:0[89]/.test(t1), t1);
  await p.click('#pSkip'); await p.waitForTimeout(1200);
  const lab = await p.textContent('#vPlayer .clockbar .lab'), tm = await p.textContent('#pTime');
  check('first EMOM minute shows Round 1 · Min 1 and counts down from 1:00', lab.includes('Round 1 · Min 1') && /0:5[89]/.test(tm), lab + ' ' + tm);
  check('NOW shows reps and the exercise', /Now: 10/.test(await p.textContent('#vPlayer .now')) && (await p.textContent('#vPlayer .now h1')).includes('Chest-supported row'));
  check('demo figure plays when no clip is saved', await p.isVisible('#pMedia canvas'));
  check('voice announced the minute', (await p.evaluate(() => window.__said)).some(s => /Chest-supported row/.test(s)));
  await shot('w-player');
  await p.click('#pMiss');
  check('Missed it toggles', (await p.textContent('#pMiss')).includes('Marked missed'));
  // reload mid-session → resume
  await p.reload(); await p.waitForSelector('.resume');
  check('reopening offers to resume', (await p.textContent('.resume')).includes('in progress'));
  await p.click('.resume .btn.go'); await p.waitForSelector('#vPlayer .clockbar');
  check('resumes at the same minute', (await p.textContent('#vPlayer .clockbar .lab')).includes('Min 1'));
  // walk the rest: wait one interval out on its own to prove auto-advance, then skip through
  await p.evaluate(() => { const PL = window.__kb.PL; PL.stepEnd = performance.now() + 600; });
  await p.waitForTimeout(1200);
  check('the timer advances to minute 2 by itself', (await p.textContent('#vPlayer .clockbar .lab')).includes('Min 2'));
  for (let k = 0; k < 80 && await p.isVisible('#vPlayer'); k++) { await p.evaluate(() => window.__kb.PL && (window.__kb.PL.stepEnd = performance.now() - 1)); await p.waitForTimeout(260); }
  await p.waitForSelector('#vFinish .well', { timeout: 15000 });
  check('finish screen shows', true);
  const res = await p.textContent('#vFinish .tiles');
  check('EMOM result counts missed minutes', /15\/16 intervals/.test(res), res);
  await p.click('#vFinish .logrow:first-child [data-kg="1"]');
  check('weight picker steps to the next bell', (await p.textContent('#vFinish .logrow:first-child .kg span')).includes('2×18 kg') || (await p.textContent('#vFinish .logrow:first-child .kg span')).includes('2×20'), await p.textContent('#vFinish .logrow:first-child .kg span'));
  await p.click('#vFinish .logrow:first-child [data-feel="easy"]');
  await p.click('#vFinish [data-rpe="7"]');
  await p.fill('#fNote', 'Back felt fine');
  await shot('w-finish');
  await p.click('#fSave'); await p.waitForSelector('#vSession');
  const D = await p.evaluate(() => window.__kb.D);
  check('session saved with weight, feel, RPE and note', D.sessions.length === 1 && D.sessions[0].rpe === 7 && D.sessions[0].note === 'Back felt fine' && Object.values(D.sessions[0].items).some(x => x.feel === 'easy'));
  check('program day 4 ticked', !!D.program.done['back-to-bells:0:3']);
  check('storage key is repcoach-workouts-v1', await p.evaluate(() => !!localStorage.getItem('repcoach-workouts-v1')));
  await p.click('#sCopy'); const clip = await p.evaluate(() => navigator.clipboard.readText());
  check('Copy log starts with the workout id and tier', clip.startsWith('Rep Coach workout — emom-upper-safe') && clip.includes('tier: '), clip.slice(0, 80));
  check('next-time suggestion moves up a bell after "easy"', (await p.evaluate(() => { const W = window.RepWorkout; return W.suggest('csrow', window.__kb.D.sessions, [8, 12, 16, 20, 24]); })).text.includes('Move up'));
  await p.click('[data-tab=hist]'); await p.waitForSelector('#vHist [data-sess]');
  check('history lists it in the last 28 days', (await p.textContent('#vHist .tiles')).includes('1'));
  await shot('w-history');

  // camera hand-off: goblet squat in a straight-sets workout
  await p.evaluate(() => window.__kb.openWorkout({ schema: 'repcoach.workout/v1', id: 'test-cam', title: 'Cam test', sections: [{ id: 'm', title: 'Squats', format: { type: 'straight' }, items: [{ ex: 'goblet', reps: 4, sets: 1, load: '16 kg' }] }] }));
  await p.click('#startW'); await p.waitForSelector('#vPlayer'); await p.click('#pSkip');
  await p.waitForSelector('#pCam'); await p.click('#pCam');
  await p.waitForFunction(() => !document.getElementById('live').hidden, null, { timeout: 15000 });
  check('Coach this set opens the camera preset to the squat', (await p.textContent('#liveName')).includes('Squat'));
  await p.waitForFunction(() => window.__repcoach.phase === 'work', null, { timeout: 15000 });
  await p.waitForFunction(() => +document.getElementById('count').firstChild.nodeValue >= 4, null, { timeout: 30000 });
  await p.waitForTimeout(2000); // let the last rep's top position be judged
  await p.click('#quitBtn');
  await p.waitForSelector('#vPlayer:not([hidden]) .note', { timeout: 10000 });
  const camNote = await p.textContent('#vPlayer .note');
  check('camera reps come back into the workout', /Camera: 4 reps, 4 clean/.test(camNote), camNote);
  await p.click('#pDone'); await p.waitForSelector('#vFinish');
  check('finish shows the camera result', (await p.textContent('#vFinish')).includes('4/4 clean'));
  await p.click('#fDiscard');

  // import: bad JSON then good
  await p.click('[data-tab=hub]'); await p.click('[data-act=import]');
  await p.fill('#impText', '{"schema":"repcoach.workout/v1","id":"x","title":"X","sections":[{"format":{"type":"emomm"},"items":[{"name":"A"}]}]}');
  await p.click('#doImp');
  check('invalid import names the field', (await p.textContent('#impErr')).includes('sections[0].format.type'));
  await p.fill('#impText', fs.readFileSync(path.join(__dirname, '..', '..', 'workouts', '2026-10-18-kb-power.json'), 'utf8'));
  await p.click('#doImp'); await p.waitForSelector('#vWorkout #startW');
  check('valid import opens the workout', (await p.textContent('#vWorkout h2')).includes('KB Power'));
  await p.click('#vWorkout [data-tier="amber"]');
  const am = await p.textContent('#vWorkout');
  check('Amber swaps the front squat to goblet', am.includes('Goblet squat'));

  // builder
  await p.click('[data-tab=hub]'); await p.click('[data-act=build]'); await p.click('[data-k=minutes][data-v="15"]'); await p.click('[data-k=format][data-v="amrap"]'); await p.click('#doBuild');
  await p.waitForSelector('#vWorkout #startW');
  check('Build for me makes a back-safe AMRAP', (await p.textContent('#vWorkout')).includes('AMRAP') && (await p.textContent('#vWorkout')).includes('Back-safe'));
  await shot('w-built');

  // library
  await p.click('[data-tab=lib]'); await p.waitForSelector('#vLib .exrow');
  await p.fill('#exSearch', 'swing'); await p.waitForTimeout(200);
  check('exercise search filters', (await p.$$('#vLib .exrow')).length >= 3);
  await p.click('#vLib [data-ex="swing"]'); await p.waitForSelector('#vEx .how');
  const ex = await p.textContent('#vEx');
  check('exercise page has how-to, muscles, mistakes, back warning', ex.includes('How to') && ex.includes('Active muscles') && ex.includes('Common mistakes') && ex.includes('physio'));
  await shot('w-exercise');
  await p.click('#addClip'); await p.waitForSelector('#vClip #recBtn');
  check('clip studio opens', true);
  await p.click('#clipBack');

  await p.click('[data-tab=cam]');
  check('Camera tab is the original coach', await p.isVisible('#startBtn'));
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
