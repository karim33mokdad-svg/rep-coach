# Workouts — feature spec (requested by the owner, 18 Oct 2026)

## What it is
A **Workouts** section in Rep Coach. Each planned session shows as a card named by its date and title ("Today · Sun 18 Oct · KB Power"). Opening it walks the owner through the session block by block. He logs what he actually did, opens the camera coach on any exercise it can track, and can record a set to review. At the end he gets one log that covers the whole session.

Sessions come from his coaching project, where the coach writes each plan, so the app is the place he *does* the workout.

## Where workouts come from
1. **Bundled:** `workouts/index.json` lists the files in `workouts/*.json`. Claude Code adds a file and an index entry, pushes, and the session appears in the app.
2. **Pasted:** an **Import workout** button accepts the JSON pasted from the coaching chat, validates it against the schema, and saves it on the phone. This is how most sessions should arrive, with no deploy needed.

Example: `workouts/2026-10-18-kb-power.json`.

## Workout file format: `repcoach.workout/v1`
```jsonc
{
  "schema": "repcoach.workout/v1",
  "id": "2026-10-18-kb-power",          // unique; date-title slug
  "date": "2026-10-18",
  "title": "KB Power", "subtitle": "…",
  "program": { "name": "The Practice", "block": "B: Strength & Power" },
  "durationMin": 55, "estKcal": [600, 750],
  "checkIn": { "question": "…", "tiers": [ { "id": "green", "label": "…" }, { "id": "amber", "label": "…" } ] },
  "rules": ["…"],                        // shown on the overview, read aloud at the start
  "sections": [ {
    "id": "armor", "title": "A · Armor Builder", "description": "…",
    "format": { "type": "straight" | "emom" | "complex" | "ladder" | "tabata" | "circuit",
                "intervalSec": 60, "rounds": 10 | { "green": 10, "amber": 8 },
                "perSide": true, "sideRestSec": 20, "restAfterRoundSec": 60, "restAfterSec": 120,
                "scheme": [5,10,15,10,5], "pairWith": "carry", "workSec": 20, "restSec": 10 },
    "items": [ {
      "id": "dfsq", "name": "Double front squat",
      "sets": 2, "reps": 3 | "5 each way", "repsScheme": [5,10,15,10,5], "durationSec": 30, "distanceM": 20, "perSide": true,
      "load": { "green": "2×16 kg", "amber": "goblet squat, 1 bell" },
      "swap": { "amber": "Goblet squat" },  // name shown instead when the Amber tier is chosen
      "restSec": 45,
      "camera": "squat",                 // optional: an EX id in coach.js; adds "Coach this set"
      "cue": "…", "demo": "https://…"
    } ]
  } ]
}
```
A value given as `{ green, amber }` resolves by the tier chosen at check-in. A plain value applies to every tier. Unknown fields are ignored, so the format can grow without breaking older files.

## Screens and behaviour
1. **Home:** a new **Workouts** tab beside the exercise picker. Today's workout is pinned on top; earlier and upcoming ones are listed below with a Done or Not started badge. Also has an **Import workout** button.
2. **Overview:** title, duration, blocks, rules. Then the **check-in**: show the question, the owner picks a tier, and every load and swap resolves for that tier.
3. **Player:** one block at a time, full screen, big type that's readable at arm's length.
   - **straight:** each item with its sets; tap to tick a set; a rest timer starts automatically.
   - **emom:** a round clock that beeps and speaks "Round 4" each interval, showing the round's items. A "Missed round" tap records a failed round. "Switch to 75 s" changes the interval.
   - **complex** (per side): a guided sequence: right side, side rest, left side, then items without a side, then round rest.
   - **ladder:** steps through the scheme ("Swings 10", then "Carry 20 m", then rest).
   - **tabata:** a work/rest timer with spoken changeovers.
   - Every item shows its load, cue and a ▶ demo link, plus a **Log** button for actual reps, load, an optional RPE from 1 to 10, and a note. Defaults come from the prescription, so logging a set as planned is one tap.
4. **Coach this set** (items with `camera`): opens the existing live camera screen preset with that exercise and target reps. When the set ends, the reps, clean reps and faults are written back into that item's log automatically. Then return to the player at the same position.
5. **Record set:** films the set with `MediaRecorder` (with the live skeleton drawn on top if the coach is running). The clip is offered to save through the share sheet. Clips are never uploaded and never stored by the app. **Analyse a recording** runs a saved clip through the coach afterwards (reuses "Analyse a video").
6. **Finish:** a session summary (blocks done, Armor Builder rounds completed, every logged set, camera results and faults) with **Copy log**. The log text starts with the workout id and the tier, ready to paste into the coaching project.

## Storage
- New key **`repcoach-workouts-v1`** holds imported workout files and per-workout progress and logs. **Do not touch `repcoach-history-v1`.** Camera sets started from a workout still save there as they do now, tagged with `workoutId` and `itemId`.
- Progress saves after every logged set, so closing the app mid-session resumes in the same place.

## Out of scope for this milestone
- Editing workouts in the app (they're authored in the coaching project).
- Camera tracking for movements not in `coach.js` (clean, bottoms-up press, carry, crawl). Those are logged manually. Hinge-only deadlift tracking could reuse swing metrics later.

## Acceptance criteria
- [ ] Today's bundled workout appears as "Today · KB Power" and plays end to end on an iPhone in Safari and as a Home Screen app.
- [ ] Choosing Amber at check-in changes the front squat to goblet, the Block A rounds to 8, and the Block C swings to deadlifts.
- [ ] The EMOM clock stays accurate within 1 s over 10 rounds, and speaks each round.
- [ ] "Coach this set" on the front squat and on the swings logs the camera's reps and faults back into the workout.
- [ ] Importing pasted JSON works; invalid JSON shows a clear error saying which field is wrong.
- [ ] Killing the app mid-session and reopening resumes at the same set.
- [ ] Copy log produces a readable summary.
- [ ] Unit tests for schema validation and tier resolution; an e2e test that plays the bundled workout with the stand-in pose model; all existing tests still green.
