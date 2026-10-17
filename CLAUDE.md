# Rep Coach — Claude Code project brief

Camera rep counter with a live form coach. Phone on the floor or a tripod, the camera watches the set, the app counts reps out loud and calls form faults ("Hips up", "Hinge, don't squat") in real time. All pose tracking runs on-device; video never leaves the phone.

Owner: Karim Mokdad (Dubai). Built first for his own training: kettlebells, calisthenics, running, Muay Thai and tai chi starting soon. Turns 39 on 21 Nov 2026. Recent injuries the coach must respect: left adductor strain (Sep 2026), right lower-back irritation (Oct 2026), left-shoulder pinch on the get-up support arm. Read `docs/PRD.md` first.

## Current state (v0.1, working)
- `index.html` is a single-page PWA: exercise picker, set-up, live camera screen, summary, history.
- `coach.js` is the coaching engine. It is pure logic with no DOM, and runs in the browser and in Node.
- `mp/` holds vendored MediaPipe Pose 0.5.1675469404 (legacy Solutions API). It loads locally with a pinned jsDelivr fallback.
- `sw.js` is a cache-first service worker, so the app works offline after the first visit. `manifest.webmanifest` and `icons/` make it installable on the Home Screen.
- Tests: `node tests/coach.test.js` runs 38 synthetic-pose checks, all passing. `tests/e2e/flow.js` drives the full app in Playwright with a stand-in pose model; `tests/e2e/recorder.js` does the same for the debug recorder.
- `?debug=landmarks` records each set's landmarks and saves them as a labelled fixture. `node tests/fixtures.test.js` replays `tests/fixtures/*.json` and scores count accuracy and fault precision per exercise (`TEST_PLAN.md` §3).

## Run
```bash
python3 -m http.server 8765        # then open http://localhost:8765 (localhost counts as secure, so the camera works)
node tests/coach.test.js           # engine tests, must stay green
node tests/fixtures.test.js        # replay recorded fixtures, must meet targets (--report to just print)
node tests/e2e/flow.js             # full-flow test (needs playwright + a local server on 8765)
node tests/e2e/recorder.js         # debug recorder flow, same setup
```
The camera needs HTTPS on a phone. Deploy target is GitHub Pages (`main` branch, root).

## Rules
1. **The engine stays pure.** `coach.js` takes landmarks plus a timestamp and returns counts, events and summaries. No DOM, no timers, no audio in the engine. The UI subscribes to events.
2. **Every threshold or fault change ships with a test** in `tests/coach.test.js`, covering a good-form sequence that stays clean and a bad-form sequence that gets flagged. Never loosen a test to make it pass. Fix the engine or justify the threshold in `docs/EXERCISES.md`.
3. **Count conservatively.** A missed rep is better than a phantom rep. A rep counts only after reaching depth and returning past the start threshold. A descent that turns back early is a *partial*, cued but not counted.
4. **Cues are short, spoken and actionable.** Three words or fewer for speech ("Chest up"). The longer explanation goes in the summary. A cue never repeats within 3.5 s.
5. **Privacy.** No video, frames or landmarks are uploaded anywhere. Only per-set summaries are stored, in `localStorage` key `repcoach-history-v1`, and they never leave the phone. **Never rename storage keys.** The owner has lost data to key changes before; add a versioned migration instead.
6. **Injury awareness beats completeness.** Don't add an exercise whose faults the camera can't see reliably (for example lumbar rounding in 2D). Say so in the setup text instead.
7. Copy is plain English and second person. Errors say what happened and what to do next.

## Key files
| File | What it is |
|---|---|
| `coach.js` | Exercise library (`EX`), geometry helpers, `createTracker()` state machine, fixture format helpers (`fixture`) |
| `tests/fixtures/` | Recorded landmark streams with hand labels, replayed by `tests/fixtures.test.js` |
| `index.html` | UI, camera, voice, history, PWA wiring |
| `docs/PRD.md` | Product goals, user, scope, what to take from Pushscroll |
| `docs/ARCHITECTURE.md` | How it works now; the target architecture and the native-app decision |
| `docs/EXERCISES.md` | Every exercise: camera view, metric, thresholds, faults, cues |
| `docs/ROADMAP.md` | Milestones with acceptance criteria. **Work from here.** |
| `docs/TEST_PLAN.md` | Synthetic tests, real-video validation protocol, device matrix |
| `docs/KICKOFF_PROMPT.md` | The first prompt to paste when starting a Claude Code session |
