# Rep Coach

Prop your phone up, train, and Rep Coach counts every rep out loud and calls your form the moment it breaks: "Hips up", "Hinge, don't squat", "Chin over the bar".

- 9 exercises: squat, KB swing, push-up, reverse lunge, overhead press, biceps curl, pull-up, pull-up negative, plank
- Live skeleton overlay, a scoreboard-size counter, spoken counts and cues
- Partial reps detected and explained, not counted
- Hands-free sets: countdown, auto end, rest timer, next set
- Per-set summary with a rep-by-rep strip, tempo, history and JSON export
- Analyse an uploaded video with the same engine
- Runs on-device (MediaPipe Pose). No video leaves your phone. Works offline once installed.

**Use it:** open https://karim33mokdad-svg.github.io/rep-coach/ in Safari, tap Share → Add to Home Screen, and allow the camera.

**Develop:** see `CLAUDE.md`. Tests: `node tests/coach.test.js` and `node tests/fixtures.test.js`.

**Record test data:** add `?debug=landmarks` to the address to save each set's pose landmarks (never video) as a labelled test fixture. See `docs/TEST_PLAN.md`.
