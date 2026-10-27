// Unit tests for the workout engine and library. Run: node tests/workout.test.js
const W = require('../workout.js'), L = require('../library.js');
const kb = require('../workouts/2026-10-18-kb-power.json');
let pass = 0, fail = 0;
const check = (n, ok, info) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${n}${!ok && info ? '  → ' + info : ''}`); };

console.log('Library');
check('every exercise has how-to, muscles and a back rating', L.EXERCISES.every(e => e.id === 'rest' || (e.how.length && e.primary && ['ok', 'care', 'load'].includes(e.back))));
check('every camera id exists in coach.js', L.EXERCISES.filter(e => e.camera).every(e => require('../coach.js').EX[e.camera]));
check('every library workout validates', L.WORKOUTS.every(w => W.validate(w).ok), L.WORKOUTS.filter(w => !W.validate(w).ok).map(w => w.id + ': ' + W.validate(w).errors[0]).join('; '));
check('every program day points at a workout', L.PROGRAMS.every(p => p.schedule.every(wk => wk.days.every(id => L.WORKOUTS.some(w => w.id === id)))));
check('back-safe workouts use only back-safe exercises', L.WORKOUTS.filter(w => w.back === 'ok').every(w => w.sections.every(s => s.items.every(it => L.BY_ID[it.ex].back === 'ok'))));
check('swings, deadlifts and loaded squats need clearance', ['swing', 'kbdl', 'goblet', 'dfsq', 'snatch', 'clean'].every(id => L.BY_ID[id].back === 'load'));

console.log('Validation');
check('bundled 18 Oct workout validates', W.validate(kb).ok);
const bad = W.validate({ schema: 'repcoach.workout/v1', id: 'x', title: 'X', sections: [{ format: { type: 'emomm' }, items: [] }] });
check('bad format type names the field', bad.errors.some(e => e.startsWith('sections[0].format.type')));
check('empty items names the field', bad.errors.some(e => e.startsWith('sections[0].items')));
check('unparseable JSON gives a plain message', /isn.t valid JSON/.test(W.parse('{oops').errors[0]));
check('a fenced code block from the chat still parses', W.parse('```json\n' + JSON.stringify(kb) + '\n```').ok);

console.log('Tiers (spec acceptance)');
const g = W.timeline(kb, 'green'), a = W.timeline(kb, 'amber');
const armor = t => t.filter(s => s.title.startsWith('A ·') && s.kind === 'work');
check('Green: 10 Armor Builder rounds, Amber: 8', armor(g).length === 10 && armor(a).length === 8);
check('Amber swaps the front squat to goblet', armor(a)[0].items.some(i => i.name === 'Goblet squat') && armor(g)[0].items.some(i => i.name === 'Double front squat'));
check('Amber swaps Block C swings to deadlifts', a.filter(s => s.title.startsWith('C ·') && s.kind === 'work').some(s => s.items[0].name === 'KB deadlift'));
check('ladder reps follow the scheme', g.filter(s => s.title.startsWith('C ·') && s.kind === 'work' && s.items[0].name === 'Two-hand swing').map(s => s.items[0].reps).join() === '5,10,15,10,5');
check('complex runs right hand, switch, left hand', g.filter(s => s.title.startsWith('B ·')).slice(0, 3).map(s => s.label).join('|').match(/Right hand\|Switch hands\|.*Left hand/));

console.log('Formats');
const one = (format, items) => W.timeline({ sections: [{ id: 'm', title: 'M', format, items }] }, 'green', { readySec: 10 });
const it2 = [{ ex: 'swing', reps: 10 }, { ex: 'goblet', reps: 8 }];
let t = one({ type: 'emom', intervalSec: 60, rounds: 3, rotate: true }, it2).filter(s => s.kind === 'work');
check('rotating EMOM: one move per minute, rounds × moves minutes', t.length === 6 && t[1].items[0].name === 'Goblet squat' && t.every(s => s.dur === 60));
t = one({ type: 'emom', intervalSec: 60, rounds: 3 }, it2).filter(s => s.kind === 'work');
check('classic EMOM: all moves every minute', t.length === 3 && t[0].items.length === 2);
t = one({ type: 'amrap', capSec: 600 }, it2);
check('AMRAP: one 10-minute block after a ready step', t.length === 2 && t[1].dur === 600 && t[1].amrap);
t = one({ type: 'intervals', workSec: 20, restSec: 10, rounds: 4 }, it2);
check('intervals alternate moves with rests between', t.map(s => s.kind[0]).join('') === 'rwrwrwrw' && t[3].items[0].name === 'Goblet squat');
t = one({ type: 'tabata' }, it2);
check('tabata defaults to 8 × 20/10', t.filter(s => s.kind === 'work').length === 8 && t[1].dur === 20);
t = one({ type: 'circuit', rounds: 2, restAfterRoundSec: 60 }, it2);
check('circuit: tap-to-advance moves with a round rest', t.map(s => s.kind[0]).join('') === 'rwwrww' && t[1].dur === null);
t = one({ type: 'straight' }, [{ ex: 'press', reps: 5, perSide: true, sets: 2, restSec: 90 }]);
check('straight sets: rest between sets, none after the last', t.map(s => s.kind[0]).join('') === 'rwrw' && t[2].dur === 90 && t[1].items[0].reps === '5/side');
t = one({ type: 'fortime', rounds: 2, capSec: 900 }, it2).filter(s => s.kind === 'work');
check('for time: every move every round, untimed', t.length === 4 && t.every(s => s.dur === null && s.fortime));

console.log('Loads and progression');
check('parses 2×16 kg', JSON.stringify(W.parseLoad('2×16 kg')) === '{"n":2,"kg":16}');
check('text loads give null', W.parseLoad('1 bell') === null);
check('next bell skips to the next one you own', W.nextBell(16, [8, 12, 16, 20, 24]) === 20 && W.nextBell(24, [8, 12, 16, 20, 24]) === 24);
const sess = feel => [{ items: { a: { ex: 'goblet', kg: 16, n: 1, feel } } }];
check('easy → move up a bell', W.suggest('goblet', sess('easy')).kg === 20);
check('right → same bell, one more rep', W.suggest('goblet', sess('right')).text.includes('one more rep'));
check('hard → stay', W.suggest('goblet', sess('hard')).kg === 16);
check('no history → no suggestion', W.suggest('goblet', []) === null);

console.log('Build for me');
for (const format of ['emom', 'amrap', 'circuit', 'intervals']) for (const focus of ['Full Body', 'Upper Body', 'Legs', 'Core', 'Rehab']) {
  const w = W.generate({ minutes: 20, focus, format, backSafe: true, seed: 7 });
  const exIds = w.sections.flatMap(s => s.items.map(i => i.ex));
  if (!W.validate(w).ok || !exIds.every(id => L.BY_ID[id].back === 'ok')) check(`built ${focus} ${format} is valid and back-safe`, false, exIds.join(','));
}
check('every built workout in Rehab mode is valid and back-safe', true);
const full = W.generate({ minutes: 30, focus: 'Full Body', format: 'emom', backSafe: false, seed: 3 });
check('outside Rehab mode it may use loaded moves and says so', W.validate(full).ok && ['care', 'load', 'ok'].includes(full.back));
check('same seed builds the same workout', JSON.stringify(W.generate({ seed: 5 }).sections) === JSON.stringify(W.generate({ seed: 5 }).sections));

console.log('History');
const now = Date.parse('2026-10-27T12:00:00Z');
const ss = [{ startedAt: '2026-10-26T10:00:00Z', durationSec: 600 }, { startedAt: '2026-10-10T10:00:00Z', durationSec: 900 }, { startedAt: '2026-09-20T10:00:00Z', durationSec: 300 }];
check('7 days', W.inRange(ss, '7d', now).count === 1);
check('28 days', W.inRange(ss, '28d', now).count === 2 && W.inRange(ss, '28d', now).seconds === 1500);
check('last month', W.inRange(ss, 'last', now).count === 1);
check('log text', W.logText({ workoutId: 'x', title: 'X', tier: 'green', startedAt: '2026-10-27T10:00:00Z', durationSec: 65, items: { a: { name: 'Swing', done: 3, kg: 16, n: 1, cam: [{ reps: 10, clean: 9, faults: ['Stand tall'] }] } } }).includes('- Swing: 3 sets @ 16 kg | camera: 10 reps, 9 clean, Stand tall'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
