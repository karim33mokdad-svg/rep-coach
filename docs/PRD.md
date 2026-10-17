# Rep Coach — Product Requirements

## The problem
Karim trains alone with kettlebells, a pull-up bar and bodyweight, following a program (KB grinds, a high-intensity day, calisthenics push and pull, a barbell posterior-chain day, mobility). He has nobody watching his form. Two injuries in a month (an adductor strain from a windmill and lower-back irritation after swings and squats) came from form drifting under fatigue. He also loses count mid-set and doesn't log consistently.

## The product in one line
Prop the phone up, train, and the app counts every rep aloud and tells you the moment your form breaks.

## User
- **Primary:** Karim. 39, intermediate, kettlebell and calisthenics focused, iPhone, trains at his building gym and at home. Wants to be strong, agile, mobile and shredded, and is moving into Muay Thai.
- **Later:** anyone training alone at home with bodyweight or kettlebells.

## Goals
1. **Counting he can trust:** at least 95% rep-count accuracy on his 9 core exercises from a correctly placed phone.
2. **Form coaching that prevents injury:** catch the faults behind his real injuries (squatting the swing, short hinge, no lockout, sagging push-ups, chest-drop squats) in real time, by voice.
3. **Hands-free:** no touching the phone between start and finish: countdown, auto end of set, rest timer, next set.
4. **One log:** every set saved with reps, clean reps, faults and tempo, and exportable into his training tracker.

## Non-goals (for now)
- Judging what 2D video can't see reliably: lumbar rounding, rotation, bracing, bar path in 3D.
- Social feed, leaderboards, accounts or a server.
- Video recording or upload.

## Scope
**v0.1, done:** 9 exercises (squat, KB swing, push-up, reverse lunge, overhead press, biceps curl, pull-up, pull-up negative, plank hold). Live counter, spoken counts and cues, partial-rep detection, rest timer, hands-free sets, per-set summary with rep-by-rep strip, history, copy log, JSON export, analyse an uploaded video, offline PWA.

**v1, next:** see `ROADMAP.md`. Covers real-video calibration, a per-user calibration rep, plan-aware sessions synced with his tracker ("The Practice"), more KB lifts (clean, snatch, goblet squat with tempo), and a Muay Thai shadow-boxing counter.

**v2:** a native iOS app if the PWA hits limits (see `ARCHITECTURE.md`), HealthKit, Apple Watch heart rate, and optionally the Pushscroll-style "earn screen time" mechanic.

## Reference: Pushscroll (competitor teardown, Oct 2026)
Pushscroll GmbH, Health & Fitness, 4.7 stars, about AED 120 a year after a 3-day trial. It blocks Instagram and TikTok until you earn minutes with exercise. The camera counts reps for 8+ exercises (push-ups, squats, plank, jumping jacks) with a skeleton overlay and a big counter, and it also earns from steps, runs and gym sessions through Apple Health.

**What we take:**
- Phone on the floor facing you, whole body in frame, and setup tips shown before the first set.
- A big live counter with a skeleton overlay. Instant, visible feedback is the core of the experience.
- A per-exercise earning rate (Pushscroll: 1 minute per rep, 1 minute per 125 steps). It's a good model if we ever add rewards.
- Progress views: a body map of muscles trained, per-exercise totals with levels, streaks.
- Gamified progression (badges, a level map). Map it onto his real skill ladders (pull-up to muscle-up, pistol, L-sit to front lever) rather than invented levels.

**What we improve on:**
- Pushscroll counts reps but doesn't coach form. **Form coaching is our point of difference.**
- It counts any movement that crosses a line. We detect partial reps and say why they didn't count.

**What we don't copy:**
- Shock-stat onboarding ("13 years of your life looking down at your phone").
- Testimonial walls.

## Success measures
- Count accuracy ≥95% and fault precision ≥80% on the validation videos (`TEST_PLAN.md`).
- He uses it for at least 3 sessions a week for 4 weeks.
- Zero form-related injuries in that period.
