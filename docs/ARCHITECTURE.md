# Architecture

## How it works today
```mermaid
flowchart LR
  CAM[Camera or video file] --> MP[MediaPipe Pose<br/>33 landmarks per frame]
  MP --> ENG[coach.js tracker<br/>smoothing → metrics → rep state machine → faults]
  ENG -->|events: rep, partial, cue, repJudged, hold, tracking| UI[index.html<br/>counter, cue banner, skeleton]
  UI --> TTS[speechSynthesis<br/>counts and cues]
  ENG -->|summary()| LOG[(localStorage<br/>repcoach-history-v1)]
```

### Engine (`coach.js`)
- **Input:** 33 BlazePose landmarks `{x, y, visibility}` (normalised, y grows downward) plus a timestamp in ms.
- **Visibility gate:** the landmarks an exercise needs must average ≥0.5 visibility. Side-view moves use the more visible side; front-view moves need both. Below that, tracking is off and the cue is "Step into frame".
- **Smoothing:** an exponential moving average (α 0.5) on every numeric metric.
- **Metrics per exercise:** one `primary` joint angle drives counting, and secondary metrics (torso lean, knee angle, body line, upper-arm angle) drive faults.
- **Rep state machine** (`dir` 'down', or 'up' through a sign flip):
  `top → descent` when primary < `start`; `→ ascent` when primary < `bottom` (plus an optional `bottomGate`, such as chin over the bar or wrist overhead); the rep is **counted** when primary > `start` again after reaching the bottom. If it never reached the bottom, it's a **partial**: cued, not counted. A post-rep window (600 ms for swings, 1200 ms otherwise) checks the top position (lockout or full extension) and closes early if the next descent starts.
- **Faults:** `rep` faults judge the min/max stats of the whole rep, `post` faults judge the top window, and `live` faults judge each frame. Live faults must persist for 300 ms and are rate-limited to one cue per 3.5 s.
- **Tempo:** `downMs` (start to deepest point), `upMs` (deepest point to rep counted), and `returnMs` (deepest point to full top, used for negatives).
- **Holds** (plank): accumulate total and good-form milliseconds; time with a live fault doesn't count as good.

### UI (`index.html`)
- Vanilla JS, no build step. The pose model loads from `mp/` and falls back to jsDelivr pinned at `@mediapipe/pose@0.5.1675469404`.
- Hands-free loop: a spoken 3-2-1 countdown, then work. The set ends automatically 9 s after the last rep, or when a hold reaches its target. A spoken summary plays, then the rest countdown ("Ten seconds"), then the next set.
- Screen wake lock while live. The front camera is mirrored. "Analyse a video" runs the same pipeline on an uploaded clip.
- Session JSON (stored and exported):
```json
{ "id": 1760680000000, "date": "2026-10-17T09:22:00Z", "ex": "squat", "name": "Squat", "load": 16, "target": 8, "setsPlanned": 3,
  "sets": [{ "reps": 8, "clean": 6, "partials": 1, "holdMs": 0, "holdGoodMs": 0, "avgDownMs": 1400, "avgUpMs": 900,
             "faults": [{ "id": "chest", "cue": "Chest up", "n": 2, "detail": "…" }],
             "perRep": [{ "n": 1, "down": 1400, "up": 900, "f": [] }] }] }
```

## Known limits
1. **Inference runs on the main thread.** On a desktop with no GPU it manages about 1 frame per second, and a slow phone may lag the timers. Fix: move to `@mediapipe/tasks-vision` PoseLandmarker with the GPU delegate, running in a Web Worker on `OffscreenCanvas`.
2. **The legacy Solutions API** (`@mediapipe/pose`) is frozen. Tasks Vision is the maintained path, but its models are served from storage.googleapis.com, so they must be vendored into the repo for offline use.
3. **2D only.** Angles are projected onto the camera plane. That's reliable side-on for sagittal moves and unreliable for anything rotational. MediaPipe's `worldLandmarks` (3D, in metres) could improve this. Evaluate before switching.
4. **iOS Safari quirks:** speech needs a user gesture first (we "unlock" it on Start), the PWA camera permission is asked once per install, and audio ducks music.

## Target architecture and the native question
**Phase A, the hardened PWA (recommended next):** Vite + TypeScript, keeping `coach.js` as a typed pure module (`src/engine/`). Pose inference in a worker with the Tasks Vision GPU delegate. Storage in IndexedDB via `idb` with a migration from the `repcoach-history-v1` key. Vitest for the engine, Playwright for end-to-end. Deployed to GitHub Pages by a GitHub Action.

**Phase B, native iOS, only if one of these becomes a must:**
| Need | Why the PWA can't | Native route |
|---|---|---|
| Earn screen time (block Instagram until reps are done) | Needs the FamilyControls / ManagedSettings / DeviceActivity APIs and an Apple entitlement | Swift + SwiftUI |
| Count while the screen is locked or in the background | Browsers suspend the camera | AVCaptureSession in the background is limited even natively; review first |
| HealthKit workouts, Apple Watch heart rate | No web API | HealthKit + WatchConnectivity |
| Better tracking | — | Apple Vision `VNDetectHumanBodyPoseRequest` (2D, 19 joints) or `VNDetectHumanBodyPose3DRequest` (iOS 17+) |

If going native, port the engine logic one-to-one into Swift (the state machine is around 200 lines) and reuse the JSON test fixtures, so both implementations pass the same synthetic sequences. Capacitor wrapping the PWA is a cheaper middle step for HealthKit, but it doesn't solve FamilyControls.
