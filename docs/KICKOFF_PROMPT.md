# Kickoff prompt for Claude Code

Paste this as the first message in a Claude Code session opened on the `rep-coach` repo:

---

Read `CLAUDE.md`, then `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/EXERCISES.md` and `docs/ROADMAP.md`. Run `node tests/coach.test.js` and confirm all checks pass before changing anything.

Then work on the first unfinished milestone in `docs/ROADMAP.md`. For this session:
1. Tell me in five lines or fewer what you're going to build and which files change.
2. Build it. Keep `coach.js` pure, and add tests for any engine change (one clean sequence and one faulty sequence).
3. Run all tests, then the full-flow test.
4. Update the roadmap checkboxes and `EXERCISES.md` if thresholds changed.
5. Commit with a clear message and push to `main`. GitHub Pages redeploys automatically.
6. Finish with: what changed, what I should test on my phone, and the exact steps.

Constraints: never rename the `repcoach-history-v1` storage key, never upload video or landmarks, and keep spoken cues to three words or fewer.

---

## Follow-up prompts by milestone
- **M1:** "Add a `?debug=landmarks` mode that records the landmark stream of a set and lets me save it as JSON. Then build `tests/fixtures.test.js` that replays fixtures with labelled counts and reports accuracy per exercise."
- **M2:** "Port to Vite + TypeScript and move pose inference to Tasks Vision in a Web Worker with the GPU delegate. Vendor the model files. Add a GitHub Action for tests and Pages deploy."
- **M4:** "Here is my tracker's backup JSON [attach]. Build import of today's session and export of completed sets in the tracker's format."
