# Roadmap

Work top to bottom. Each milestone is done only when its acceptance criteria pass and the tests are green.

## M0 — Live on the phone ✅ / in progress
- [x] Engine, 9 exercises, 38 synthetic tests passing
- [x] PWA: offline cache, Home Screen install, wake lock, voice
- [ ] Deployed to GitHub Pages; owner opens it in Safari, adds it to the Home Screen, and completes one squat set with correct counts
**Accept:** owner confirms the count and cues on a real set.

## M1 — Calibrate on real video (highest value)
- [x] `?debug=landmarks` mode: records each set's landmark stream, lets you label true reps and faulty reps, and saves it as a fixture JSON (share sheet → Save to Files on iPhone)
- [x] `tests/fixtures.test.js` replays `tests/fixtures/*.json` through the engine and reports count accuracy and fault precision and recall per exercise; fails below target (`--report` to just print)
- [x] A synthetic sample fixture (`tests/tools/make-sample-fixture.js`) and a browser test for the recorder (`tests/e2e/recorder.js`)
- [ ] Record the validation set in `TEST_PLAN.md` (owner films 9 exercises, good and faulty, side and front) and commit the labelled fixtures
- [ ] Tune thresholds until counts are ≥95% and fault precision ≥80%. Document every change in `EXERCISES.md`.
**Accept:** the fixture report meets those targets; no synthetic test regressed.

## M2 — Engine and performance hardening
- Port to Vite + TypeScript (`src/engine`, `src/ui`). Keep the zero-dependency runtime.
- Switch to `@mediapipe/tasks-vision` PoseLandmarker (GPU delegate) in a Web Worker. Vendor the `.task` model and wasm.
- IndexedDB storage with a migration from `repcoach-history-v1` (read the old key, write the new store, never delete the old key).
- A GitHub Action that runs the tests and deploys Pages on push to `main`.
**Accept:** ≥24 fps on iPhone 12 or newer; cold start under 4 s; history migrates intact.

## M3 — Personal calibration
- A "calibration rep" per exercise: the user does 2 slow good reps, and the app records their real range and sets personal start/bottom/top thresholds (bounded to ±15° of the defaults).
- Fault thresholds stay global, because they encode safety.
**Accept:** counting accuracy improves on the owner's fixtures, or stays the same at minimum.

## M4 — Plan-aware training (link to "The Practice" tracker)
- Import today's session from the owner's tracker (JSON, the same shape as its backup export) and run the camera-trackable exercises in order, with targets, loads and rests prefilled.
- Export completed sets in the tracker's import format so logs land in one place.
- Read-only safety flags: if the plan marks an injury (back, adductor), cap depth or swap the exercise, and say why.
**Accept:** a full Wednesday HIIT or Saturday push session runs hands-free start to finish and imports cleanly into the tracker.

## M5 — More movements
- KB clean, KB snatch, goblet squat tempo mode, Cossack depth, a guided Turkish get-up checklist, and Muay Thai shadow-boxing strike counting per round (specs in `EXERCISES.md`).
**Accept:** each new movement passes synthetic and real-video tests.

## M6 — Progress and motivation
- Per-exercise trends: reps, clean %, tempo, best set. A body map of muscles trained this week.
- Skill ladders shown as levels (pull-up to muscle-up, push-up to dip, pistol, L-sit to front lever).
- Streaks. A shareable summary card (an image generated on-device).

## M7 — Native iOS (only if needed; see the decision table in `ARCHITECTURE.md`)
- SwiftUI app with a Swift port of the engine, Apple Vision body pose, HealthKit workouts and the Apple Watch heart-rate overlay.
- Optional: an "earn screen time" mode using FamilyControls (needs an Apple entitlement request).
