# Exercise specs

Angles are in degrees. *Start / bottom / top* are the rep state machine thresholds on the **primary** metric (see `ARCHITECTURE.md`). Every value here mirrors `coach.js`; change both together, with a test.

| Exercise | View | Primary metric | Start | Bottom | Top | Min rep | Partial cue | Top cue |
|---|---|---|---|---|---|---|---|---|
| Squat (goblet or bodyweight) | Side | Knee (hip–knee–ankle) | <150 | <100 | >160 | 600 ms | Deeper | Stand tall |
| KB swing | Side | Hip (shoulder–hip–knee) | <150 | <130 | >158 | 450 ms | Hips back | (lockout fault) |
| Push-up | Side, phone on floor | Elbow (shoulder–elbow–wrist) | <145 | <95 | >155 | 500 ms | Lower | Arms straight |
| Reverse lunge | Side | Smaller knee angle of the two | <150 | <105 | >160 | 600 ms | Knee lower | Stand tall |
| Overhead press | Front | Elbow of the higher arm (counts upward) | >110 | >160 and wrist above nose | <100 | 500 ms | Lock it out | — |
| Biceps curl | Side | Elbow | <130 | <60 | >145 | 600 ms | Full squeeze | Full extension |
| Pull-up | Front | Mean elbow angle | <140 | <80 and nose above wrists | >155 | 600 ms | Chin over the bar | Full hang |
| Pull-up negative | Front | Mean elbow angle | <140 | <80 | >155 | 400 ms | Start higher | — |
| Plank (hold) | Side, phone on floor | Body line (shoulder–hip–ankle) | — | — | — | — | — | — |

## Faults
| Exercise | Id | When judged | Test | Spoken cue | Why it matters for Karim |
|---|---|---|---|---|---|
| Squat | chest | rep | torso leans >20° further forward than the shins, and >45° from vertical | Chest up | Chest drop under fatigue preceded his back irritation. Judged against the shins (a torso roughly parallel to the shin is balanced for any limb length) so normal bodyweight lean isn't flagged. Changed from a fixed 50° after the owner's first live test (Oct 17) flagged good bodyweight squats |
| Squat | hips | rep | torso tips >12° further forward on the way up than at the bottom | Lead with chest | Hips rising before the chest turns the squat into a good-morning and loads the lower back |
| Swing | squat | rep | min knee <120° and max torso <45° | Hinge, don’t squat | The most common cause of lower-back strain in swings |
| Swing | knees | rep | min knee <120° and torso ≥45° | Less knee | Hip hinge with too much knee |
| Swing | short | rep | min hip >110° | Hips back | Glutes never load, so the back does the work |
| Swing | low | rep | max torso >85° | Shorter backswing | Near-flat torso is where rounding starts |
| Swing | lockout | post | top hip <165° | Stand tall | Soft finish; the bell floats on the back |
| Push-up | sag / pike | live | body line <160° and hip below / above the shoulder–ankle line by >3% of body length | Hips up / Hips down | Sagging loads the lower back |
| Lunge | lean | rep | torso lean >25° | Stay tall | Protects the adductor (keeps the step straight back) |
| Press | shift | rep | shoulder midpoint offset from hip midpoint >15% of torso length | Stay stacked | Side-bending under the bell pinches the low back |
| Curl | elbow | rep | upper arm >30° from vertical | Pin your elbows | Turns a curl into a front raise |
| Curl | swing | rep | torso rocks >12° from the starting posture | No swinging | Momentum, not biceps |
| Negative | fast | post | lowering (deepest point to full hang) <3.5 s | Slower down | His progression needs 5-second negatives |
| Plank | sag / pike | live | as push-up, body line <162° | Hips up / Hips down | — |

Push-ups and planks are gated on the body being horizontal (shoulder–ankle line >50° from vertical), so arm bends while standing never count. Pull-ups are gated on the wrists being above the shoulders.

## Adding an exercise
1. Add an entry to `EX` in `coach.js`: name, kit, view, bell colour, setup text, `need`, `dir`, thresholds, `metrics(lm)`, `faults[]`, partial and top cues.
2. Add a generator plus at least one clean sequence and one faulty sequence to `tests/coach.test.js`.
3. Add a row to both tables above.
4. Add it to `order` in `index.html`.
5. Validate on real video (`TEST_PLAN.md`) before telling the owner it's ready.

## Candidates for v1
- **KB clean** (side): count rack arrivals using the wrist path. Fault: the bell banging the forearm (wrist velocity spike at rack).
- **KB snatch** (side): count wrist above nose plus elbow lockout. Faults: pressing out (elbow bend at the top), no hip snap (reuse the swing's hip metrics).
- **Turkish get-up:** don't count it. Use guided step cues with a check of support-arm angle and hand placement (for his left-shoulder pinch).
- **Muay Thai shadow boxing:** count strikes per 3-minute round from wrist-velocity peaks (jab or cross by arm) and teeps from ankle-velocity peaks. Cue "Hands up" when a wrist drops below the chin for >1 s between strikes.
- **Cossack and lateral lunge** (front view): depth tracking only, with a conservative depth cap during adductor rehab.
