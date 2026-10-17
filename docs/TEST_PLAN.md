# Test plan

## 1. Synthetic engine tests: `node tests/coach.test.js`
Hand-built skeletons (side-on standing figure, horizontal plank, front-view arms, pull-up hang) are swept through joint angles, with noise added. 34 checks cover counting, partial detection, every fault firing on bad form and staying quiet on good form, the visibility gate, the horizontal gate for push-ups, hold timing, and jitter robustness. **These must stay green on every commit.**

## 2. Full-flow test: `node tests/e2e/flow.js`
Playwright loads the app with a stand-in pose model that streams synthetic frames only during the work phase. It checks the spoken sequence (countdown, counts, "Target hit", fault cue, set summary, rest, set 2), the session summary, and history. Block service workers in the test context, or the cached real model bypasses the stand-in.

## 3. Real-video validation (M1)
The owner films each clip on his iPhone, phone placed as the setup text says:
| Exercise | Good-form clip | Faulty clip (deliberate, light load) |
|---|---|---|
| Squat | 10 reps goblet 16 kg | 5 chest-drop + 5 half-depth |
| KB swing | 15 reps 16 kg | 5 squatted + 5 soft lockout (light bell) |
| Push-up | 10 reps | 5 sagging + 5 half range |
| Reverse lunge | 10 reps alternating | 5 leaning forward |
| Overhead press | 8 reps per arm | 5 half lockout |
| Biceps curl | 10 reps | 5 swinging |
| Pull-up / negative | max reps / 3 negatives | 3 half reps / 3 fast negatives |
| Plank | 30 s | 10 s good + 10 s sag |

Label the true rep count and the faulty reps for each clip. Score:
- **Count accuracy** = 1 − |counted − true| / true, per clip. Target ≥95%.
- **Fault precision** = flagged-and-actually-faulty / all flagged. Target ≥80%. Recall is reported but not gated.

Also test the difficult conditions: dim light, a cluttered background, baggy clothes, the camera at 2 m versus 4 m, and the back versus front camera.

## 4. Device matrix
iPhone (Safari and the Home Screen PWA). The owner's own device is required. An older iPhone and a mid-range Android Chrome are nice to have. Check: camera permission, voice, wake lock, offline after the first load, and frames per second (shown in the debug overlay; add one in M2).
