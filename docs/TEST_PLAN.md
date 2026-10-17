# Test plan

## 1. Synthetic engine tests: `node tests/coach.test.js`
Hand-built skeletons (side-on standing figure, horizontal plank, front-view arms, pull-up hang) are swept through joint angles, with noise added. 38 checks cover counting, partial detection, every fault firing on bad form and staying quiet on good form, the visibility gate, the horizontal gate for push-ups, hold timing, and jitter robustness. **These must stay green on every commit.**

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

### Turning a clip into a fixture
1. Open the app with `?debug=landmarks` on the end of the address, for example `https://karim33mokdad-svg.github.io/rep-coach/?debug=landmarks`. A note on the home screen confirms recording is on, and the live screen shows "REC".
2. Pick the exercise, then tap **Analyse a video** and choose the clip (or do a live set).
3. When it finishes, the **Landmark recording** panel shows what the app counted. For each set, enter:
   - **Actual full reps:** the true count. Half reps don't count.
   - **Reps with a fault:** `id:reps`, for example `chest:1-5`, `squat:1-5, lockout:6-10` or `chest:all`. Leave it blank for a clean set. The panel lists the fault ids for that exercise (`top` is the "Stand tall" / "Full hang" type of fault).
   - **What was this clip?** For example "goblet 16 kg, deliberate chest drop".
4. Tap **Save recording**. On iPhone, choose **Save to Files**. Send the file to the repo as `tests/fixtures/<name>.json`.
5. Run `node tests/fixtures.test.js`. It replays every labelled set and prints count accuracy, fault precision and recall per exercise. It exits with an error below target; add `--report` while tuning.

Only landmark coordinates are saved, never video. The file stays on the phone unless you share it.

Rep numbers in the labels are matched to the app's rep numbers. If the app misses or adds a rep partway through a mixed clip, the labels after it shift, so prefer one fault type per clip.

Label the true rep count and the faulty reps for each clip. Score:
- **Count accuracy** = 1 − |counted − true| / true, per clip. Target ≥95%.
- **Fault precision** = flagged-and-actually-faulty / all flagged. Target ≥80%. Recall is reported but not gated.

Also test the difficult conditions: dim light, a cluttered background, baggy clothes, the camera at 2 m versus 4 m, and the back versus front camera.

## 4. Device matrix
iPhone (Safari and the Home Screen PWA). The owner's own device is required. An older iPhone and a mid-range Android Chrome are nice to have. Check: camera permission, voice, wake lock, offline after the first load, and frames per second (shown in the debug overlay; add one in M2).
