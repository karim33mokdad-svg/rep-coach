const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
// reuse the unit-test pose generator
const src = fs.readFileSync(require('path').join(__dirname, '..', 'coach.test.js'), 'utf8');
const gen = src.slice(src.indexOf('const rad ='), src.indexOf('const faultIds'));
const { P } = require(require('path').join(__dirname, '..', '..', 'coach.js'));
const mk = new Function('P', gen + 'return { sideStand, sweep };')(P);
const frames = [];
const idle = n => { for (let i = 0; i < n; i++) frames.push(mk.sideStand({ knee: 175, torso: 5 })); };
idle(30);
mk.sweep(175, 85, 5, 30, 12).forEach(k => frames.push(mk.sideStand({ knee: k, torso: 10 + (175 - k) * 0.3 })));   // set 1: 5 clean
idle(700);                                                                                                            // idle → auto end, rest
mk.sweep(175, 85, 3, 30, 12).forEach(k => frames.push(mk.sideStand({ knee: k, torso: 10 + (175 - k) * 0.7 })));   // set 2: chest drops
mk.sweep(175, 128, 1, 30, 12).forEach(k => frames.push(mk.sideStand({ knee: k })));                                // one partial
idle(4000);
const fake = `window.Pose = class { constructor(){ this.i=0; } setOptions(){} onResults(cb){ this.cb=cb; } async initialize(){}
  async send(){ await new Promise(r=>setTimeout(r,12)); const work = window.__repcoach && window.__repcoach.phase === 'work'; const f = window.__F[Math.min(work ? this.i++ : this.i, window.__F.length-1)]; this.cb({ poseLandmarks: f }); } };`;
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' }); const p = await ctx2.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__said = []; const S = window.SpeechSynthesisUtterance; window.speechSynthesis.speak = u => window.__said.push(u.text); });
  await p.route('**/mp/pose.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.__F=' + JSON.stringify(frames) + ';' + fake }));
  await p.goto('http://localhost:8765/?tab=camera');
  await p.evaluate(() => { localStorage.clear(); });
  await p.reload(); await p.waitForFunction(() => document.getElementById('sModel').textContent.includes('ready'));
  await p.fill('#target', '5'); await p.fill('#sets', '2'); await p.fill('#rest', '15'); await p.dispatchEvent('#rest', 'change');
  await p.click('#startBtn');
  let shot = false;
  for (let i = 0; i < 140; i++) {
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ ph: window.__repcoach.phase, c: document.getElementById('count').firstChild.nodeValue, home: !document.getElementById('home').hidden }));
    if (!shot && st.c === '3') { await p.screenshot({ path: require('path').join(__dirname, 'live-count.png') }); shot = true; }
    if (st.home) break;
  }
  await p.waitForTimeout(500);
  console.log('said:', (await p.evaluate(() => window.__said)).filter(s => s.trim()).join(' / '));
  const sum = await p.textContent('#sumBody'); console.log('summary:', sum.replace(/\s+/g, ' ').slice(0, 400));
  console.log('history:', (await p.textContent('#history')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: require('path').join(__dirname, 'summary.png'), fullPage: true });
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
