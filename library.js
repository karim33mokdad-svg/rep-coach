/* Rep Coach — kettlebell library: exercises, glossary, workouts and programs. Pure data, no DOM.
 * Exercise fields:
 *   cat      Legs | Upper Body | Core | Full Body | Rehab
 *   pattern  which animated demo figure to show when no clip has been added (see demo.js)
 *   kit      kb (one bell) | 2kb (two bells) | bw (bodyweight) | bench | bar | band
 *   back     ok   = fine while the lower back is recovering
 *            care = light and slow only, stop if it talks
 *            load = loads the spine; needs the physio's go-ahead first
 *   camera   an EX id in coach.js when the live coach can count and check it
 *   side     true when it is done one side at a time
 */
(function (root) {
  'use strict';
  const X = (id, name, cat, pattern, kit, back, primary, secondary, how, mistakes, extra = {}) =>
    ({ id, name, cat, pattern, kit, back, primary, secondary, how, mistakes, ...extra });

  const EXERCISES = [
    // ── Hinge ──
    X('swing', 'Two-hand swing', 'Full Body', 'swing', 'kb', 'load', 'Glutes, hamstrings', 'Back, core, grip',
      ['Bell a foot in front of you. Hinge, tilt it back and hike it high between your thighs.',
       'Snap your hips and knees straight so the bell floats to chest height. Arms are ropes.',
       'Let it fall, hinge late, and send it back between your legs. Breathe out at the top.'],
      ['Squatting the swing: knees travel forward and the hips drop.', 'Lifting with the arms instead of the hips.', 'Leaning back at the top instead of standing tall.'],
      { camera: 'swing', q: 'kettlebell swing hip hinge form' }),
    X('swing1', 'One-arm swing', 'Full Body', 'swing', 'kb', 'load', 'Glutes, hamstrings', 'Obliques, lats, grip',
      ['Same hinge as the two-hand swing, one hand on the handle.', 'Keep both shoulders square to the front. The free arm can mirror the bell.', 'Pack the shoulder at the top: no shrugging.'],
      ['Letting the bell twist you open.', 'Shoulder pulled forward at the bottom.'], { side: true, camera: 'swing', q: 'one arm kettlebell swing form' }),
    X('h2h', 'Hand-to-hand swing', 'Full Body', 'swing', 'kb', 'load', 'Glutes, hamstrings', 'Core, grip, coordination',
      ['One-arm swing, but switch hands when the bell floats at the top.', 'Catch it with the new hand before it drops.'],
      ['Switching too late, at the bottom.', 'Reaching forward to catch.'], { camera: 'swing', q: 'hand to hand kettlebell swing' }),
    X('dswing', 'Double swing', 'Full Body', 'swing', '2kb', 'load', 'Glutes, hamstrings', 'Back, core, grip',
      ['Two bells, feet a little wider than usual so they pass between your legs.', 'Hike both back high, snap the hips, float them to chest height.'],
      ['Feet too narrow, so the bells hit your thighs.', 'Rounding the back at the bottom.'], { camera: 'swing', q: 'double kettlebell swing' }),
    X('kbdl', 'Kettlebell deadlift', 'Legs', 'hinge', 'kb', 'load', 'Glutes, hamstrings', 'Back, grip',
      ['Bell between your feet, under the middle of your foot.', 'Push your hips back, long spine, grip the handle and pull your shoulders down.', 'Push the floor away and stand tall. Lower it the same way.'],
      ['Squatting down to the bell instead of hinging.', 'Rounding the lower back to reach it.', 'Leaning back at the top.'], { q: 'kettlebell deadlift form' }),
    X('sldl', 'Single-leg deadlift', 'Legs', 'hinge', 'kb', 'care', 'Hamstrings, glutes', 'Foot and hip stability',
      ['Bell in the hand opposite the standing leg.', 'Hinge forward as the free leg reaches back; hips stay level.', 'Go until you feel the hamstring, then stand back up.'],
      ['Hips opening toward the ceiling.', 'Reaching for the floor with a rounded back.'], { side: true, q: 'single leg kettlebell deadlift' }),
    X('drdl', 'Double Romanian deadlift', 'Legs', 'hinge', '2kb', 'load', 'Hamstrings', 'Glutes, back',
      ['Stand tall with a bell in each hand.', 'Soft knees, push your hips back and slide the bells down your thighs to mid-shin.', 'Drive your hips forward to stand.'],
      ['Bending the knees so it becomes a squat.', 'Bells drifting away from your legs.'], { q: 'double kettlebell romanian deadlift' }),
    X('suitcasedl', 'Suitcase deadlift', 'Legs', 'hinge', 'kb', 'care', 'Glutes, hamstrings', 'Obliques',
      ['Bell beside one foot.', 'Hinge and squat down just enough to grip it; stay square and tall.', 'Stand up without leaning toward the bell.'],
      ['Leaning toward the bell.', 'Twisting to pick it up.'], { side: true, q: 'kettlebell suitcase deadlift' }),
    X('bridge', 'Glute bridge', 'Rehab', 'bridge', 'bw', 'ok', 'Glutes', 'Hamstrings',
      ['On your back, knees bent, feet flat.', 'Breathe out, ribs down, then lift your hips until you form a line from knees to shoulders.', 'Squeeze for 2 seconds, lower slowly.'],
      ['Arching the lower back to get higher.', 'Pushing through the toes.'], { q: 'glute bridge form' }),

    // ── Squat and lunge ──
    X('goblet', 'Goblet squat', 'Legs', 'squat', 'kb', 'load', 'Quads, glutes', 'Core, upper back',
      ['Hold the bell by the horns at your chest, elbows under it.', 'Sit between your hips, chest up, knees track over the toes.', 'Drive up through the whole foot and stand tall.'],
      ['Chest dropping and back rounding.', 'Knees caving in.', 'Heels lifting.'], { camera: 'squat', q: 'goblet squat form' }),
    X('boxsquat', 'Goblet box squat', 'Legs', 'squat', 'kb', 'care', 'Quads, glutes', 'Core',
      ['Box or bench behind you at knee height. Hold a light bell at your chest.', 'Sit back until you just touch the box, stay braced, stand up.'],
      ['Flopping onto the box.', 'Rocking forward to stand.'], { camera: 'squat', q: 'goblet box squat' }),
    X('dfsq', 'Double front squat', 'Legs', 'squat', '2kb', 'load', 'Quads, glutes', 'Core, upper back',
      ['Two bells in the rack, forearms vertical, elbows tucked.', 'Squat down with the chest up and the bells stacked on you.', 'Stand up as one piece.'],
      ['Elbows dropping so the bells pull your chest down.', 'Losing the brace on the last reps. It hurt your back on 18 Oct.'], { camera: 'squat', q: 'double kettlebell front squat' }),
    X('prying', 'Goblet prying squat', 'Legs', 'squat', 'kb', 'care', 'Hips, adductors', 'Ankles',
      ['Sit in the bottom of a goblet squat.', 'Push your knees out with your elbows and sway gently side to side.'],
      ['Collapsing onto the lower back.', 'Forcing range that pinches.'], { q: 'goblet prying squat' }),
    X('cossack', 'Cossack squat', 'Legs', 'lunge', 'bw', 'care', 'Adductors, quads', 'Glutes, hips',
      ['Wide stance. Shift onto one leg and sit down over it; the other leg stays straight, toes up.', 'Go only as deep as you control. Stand back up through the middle.'],
      ['Diving deeper than your adductors allow.', 'Heel of the bent leg lifting.'], { side: true, q: 'cossack squat form' }),
    X('revlunge', 'Reverse lunge', 'Legs', 'lunge', 'kb', 'care', 'Quads, glutes', 'Adductors, balance',
      ['Hold the bell at your chest. Step straight back.', 'Lower until the back knee nearly touches the floor, torso tall.', 'Push through the front foot to stand.'],
      ['Stepping back on a tightrope.', 'Leaning forward over the front knee.'], { side: true, camera: 'lunge', q: 'kettlebell reverse lunge' }),
    X('rackLunge', 'Double rack reverse lunge', 'Legs', 'lunge', '2kb', 'load', 'Quads, glutes', 'Core, upper back',
      ['Two bells in the rack. Step back and lower under control.', 'Stay tall; drive up through the front foot.'],
      ['Elbows drifting forward.', 'Rushing the step.'], { side: true, camera: 'lunge', q: 'double kettlebell front rack reverse lunge' }),
    X('splitiso', 'Split squat hold', 'Rehab', 'lunge', 'bw', 'ok', 'Quads', 'Glutes, tendons',
      ['Split stance, lower halfway and hold. Touch a wall for balance.', 'Torso tall, breathe slowly.'],
      ['Holding your breath.', 'Leaning forward.'], { side: true, q: 'split squat isometric hold' }),
    X('lateral', 'Lateral lunge', 'Legs', 'lunge', 'kb', 'care', 'Adductors, glutes', 'Quads',
      ['Step wide to one side and sit back into that hip; the other leg stays straight.', 'Push back to the middle.'],
      ['Knee falling inward.', 'Rounding forward.'], { side: true, q: 'kettlebell lateral lunge' }),
    X('stepup', 'Step-up', 'Legs', 'lunge', 'kb', 'care', 'Quads, glutes', 'Balance',
      ['Whole foot on a box or bench. Hold a bell at your chest or by your side.', 'Stand up on it without pushing off the back foot. Step down slowly.'],
      ['Pushing off the floor leg.', 'Knee caving in on the way up.'], { side: true, q: 'kettlebell step up form' }),
    X('wallsit', 'Wall sit', 'Rehab', 'wallsit', 'bw', 'ok', 'Quads', 'Patellar tendon',
      ['Back flat on the wall, slide down until your knees are at about 90°.', 'Feet under your knees. Breathe.'],
      ['Hands pushing on the thighs.', 'Lower back peeling off the wall.'], { q: 'wall sit form' }),

    // ── Ballistics ──
    X('clean', 'Kettlebell clean', 'Full Body', 'clean', 'kb', 'load', 'Glutes, hamstrings', 'Upper back, grip',
      ['Hike the bell back like a swing.', 'Snap your hips and keep the elbow close; the bell travels close to your body.', 'Hand slides around the handle and the bell lands softly in the rack.'],
      ['Swinging it out wide so it bangs your forearm.', 'Curling it up with the arm.'], { side: true, q: 'kettlebell clean technique' }),
    X('dclean', 'Double clean', 'Full Body', 'clean', '2kb', 'load', 'Glutes, hamstrings', 'Upper back, grip',
      ['Two bells hiked back, snap the hips, elbows close.', 'Both bells land softly in the rack, wrists straight.'],
      ['Bells crashing onto the forearms.', 'Leaning back to catch them.'], { q: 'double kettlebell clean' }),
    X('snatch', 'Kettlebell snatch', 'Full Body', 'snatch', 'kb', 'load', 'Glutes, hamstrings', 'Shoulders, grip',
      ['Swing back, snap the hips hard, keep the bell close.', 'Punch your hand through at the top so the bell lands softly on your forearm, arm locked overhead.', 'Let it drop back into the next swing.'],
      ['Arcing it out like a swing, so it flips and bangs.', 'Pressing it out at the top.'], { side: true, q: 'kettlebell snatch technique' }),
    X('highpull', 'High pull', 'Full Body', 'swing', 'kb', 'load', 'Glutes, upper back', 'Rear shoulders',
      ['Swing the bell, then at the top pull your elbow back so the bell comes to your chest.', 'Push it back out and swing.'],
      ['Pulling with the arm before the hips finish.', 'Shrugging.'], { side: true, q: 'kettlebell high pull' }),
    X('pushpress', 'Push press', 'Full Body', 'press', 'kb', 'load', 'Shoulders, triceps', 'Legs',
      ['Bell in the rack. Dip a few centimetres at the knees, then drive up.', 'Use that drive to press the bell to lockout. Lower to the rack.'],
      ['Dipping too deep.', 'Arching the lower back at lockout.'], { side: true, camera: 'press', q: 'kettlebell push press' }),
    X('thruster', 'Kettlebell thruster', 'Full Body', 'squat', 'kb', 'load', 'Quads, shoulders', 'Glutes, core',
      ['Goblet or rack hold. Squat down.', 'Drive up and use that momentum to press overhead in one move.'],
      ['Pressing before your legs finish.', 'Elbows dropping at the bottom.'], { q: 'kettlebell thruster' }),

    // ── Press and push ──
    X('press', 'Strict press', 'Upper Body', 'press', 'kb', 'care', 'Shoulders', 'Triceps, upper back',
      ['Bell in the rack, glutes and abs tight.', 'Press straight up, finishing with the bicep by your ear.', 'Pull it back down to the rack.'],
      ['Leaning back to finish the rep.', 'Elbow flaring early.'], { side: true, camera: 'press', q: 'kettlebell strict press' }),
    X('dpress', 'Double press', 'Upper Body', 'press', '2kb', 'load', 'Shoulders', 'Triceps, core',
      ['Two bells in the rack. Squeeze everything.', 'Press both up, biceps by the ears. Ribs stay down.'],
      ['Arching the back to finish.', 'One bell racing ahead.'], { camera: 'press', q: 'double kettlebell press' }),
    X('hkpress', 'Half-kneeling press', 'Upper Body', 'press', 'kb', 'care', 'Shoulders', 'Core, hip flexors',
      ['Kneel on the side of the pressing arm, front foot flat.', 'Squeeze the down-side glute and press.'],
      ['Arching back to finish.', 'Leaning away from the bell.'], { side: true, camera: 'press', q: 'half kneeling kettlebell press' }),
    X('bupress', 'Bottoms-up press', 'Upper Body', 'press', 'kb', 'care', 'Shoulders', 'Grip, rotator cuff',
      ['Hold the bell upside down by the handle, crushing it.', 'Press slowly; if it tips, reset.'],
      ['Loose grip.', 'Rushing.'], { side: true, q: 'bottoms up kettlebell press' }),
    X('floorpress', 'Floor press', 'Upper Body', 'floorpress', 'kb', 'ok', 'Chest, triceps', 'Shoulders',
      ['On your back, knees bent, bell in one or both hands.', 'Press up to lockout; lower until your upper arm touches the floor.'],
      ['Bouncing the elbow off the floor.', 'Arching the lower back.'], { q: 'kettlebell floor press' }),
    X('pushup', 'Push-up', 'Upper Body', 'pushup', 'bw', 'care', 'Chest, triceps', 'Shoulders, core',
      ['Hands under the shoulders, body in one straight line.', 'Lower until your chest is near the floor, elbows at about 45°.', 'Press back up without the hips sagging.'],
      ['Hips sagging.', 'Half reps.'], { camera: 'pushup', q: 'push up form' }),
    X('inclinepu', 'Incline push-up', 'Upper Body', 'pushup', 'bench', 'ok', 'Chest, triceps', 'Core',
      ['Hands on a bench or counter, body straight.', 'Lower your chest to the edge, press back.'],
      ['Ribs flaring.', 'Head poking forward.'], { q: 'incline push up form' }),

    // ── Pull ──
    X('row', 'Bent-over row', 'Upper Body', 'row', 'kb', 'care', 'Lats, upper back', 'Biceps, rear shoulders',
      ['Hinge with one hand on a bench, long flat back.', 'Row the bell to your hip, elbow close.', 'Lower all the way.'],
      ['Twisting to lift the bell.', 'Shrugging toward the ear.'], { side: true, q: 'kettlebell bent over row form' }),
    X('csrow', 'Chest-supported row', 'Upper Body', 'row', 'bench', 'ok', 'Lats, upper back', 'Biceps',
      ['Lie face down on an incline bench, a bell in each hand.', 'Row both up, squeeze the shoulder blades, lower slowly.'],
      ['Chest lifting off the pad.', 'Shrugging.'], { q: 'chest supported kettlebell row incline bench' }),
    X('gorilla', 'Gorilla row', 'Upper Body', 'row', '2kb', 'load', 'Lats, upper back', 'Core, hamstrings',
      ['Wide stance, hinge over two bells.', 'Row one, lower, then row the other. Stay square.'],
      ['Rotating the torso.', 'Rounding the back.'], { q: 'kettlebell gorilla row' }),
    X('renegade', 'Renegade row', 'Upper Body', 'plank', '2kb', 'care', 'Lats, core', 'Shoulders',
      ['Push-up position on two bells, feet wide.', 'Row one bell without rotating your hips.'],
      ['Hips twisting open.', 'Feet too narrow.'], { side: true, q: 'kettlebell renegade row' }),
    X('suspRow', 'Suspension row', 'Upper Body', 'row', 'bw', 'ok', 'Lats, upper back', 'Biceps, core',
      ['Hold the straps, lean back with a straight body.', 'Pull your chest to your hands, lower slowly.', 'Walk your feet forward to make it harder.'],
      ['Hips sagging.', 'Shrugging.'], { q: 'trx row form' }),
    X('pullup', 'Pull-up', 'Upper Body', 'hang', 'bar', 'care', 'Lats', 'Biceps, core',
      ['Hang with straight arms, shoulders active.', 'Pull your chin over the bar, lower all the way.'],
      ['Half reps.', 'Kicking.'], { camera: 'pullup', q: 'strict pull up form' }),
    X('negative', 'Pull-up negative', 'Upper Body', 'hang', 'bar', 'care', 'Lats', 'Biceps, grip',
      ['Jump or step to the top position.', 'Lower yourself over 5 seconds.'],
      ['Dropping the last third.', 'Rushing.'], { camera: 'negative', q: 'pull up negatives form' }),
    X('feethang', 'Feet-supported hang', 'Rehab', 'hang', 'bar', 'ok', 'Lats, grip', 'Shoulders',
      ['Hang from a low bar with your feet on the floor.', 'Let your shoulders stretch; take some weight through your legs.'],
      ['Hanging all your weight while the back is sore.', 'Shrugging into your ears.'], { q: 'feet supported dead hang' }),

    // ── Arms ──
    X('curl', 'Kettlebell curl', 'Upper Body', 'curl', 'kb', 'ok', 'Biceps', 'Forearms',
      ['Stand tall, elbows pinned to your sides.', 'Curl up, squeeze, lower slowly.'],
      ['Swinging the body.', 'Elbows drifting forward.'], { camera: 'curl', q: 'kettlebell bicep curl' }),
    X('inclinecurl', 'Incline curl', 'Upper Body', 'curl', 'bench', 'ok', 'Biceps', 'Forearms',
      ['Bench at 45–60°, back on the pad, arms hanging.', 'Curl without moving the upper arm.'],
      ['Shoulders rolling forward.', 'Shortening the bottom of the rep.'], { q: 'incline dumbbell curl' }),
    X('triext', 'Lying triceps extension', 'Upper Body', 'floorpress', 'kb', 'ok', 'Triceps', '—',
      ['On your back, hold the bell by the horns over your face.', 'Bend only at the elbows to lower it behind your head, then extend.'],
      ['Elbows flaring.', 'Arching the lower back.'], { q: 'lying kettlebell triceps extension' }),

    // ── Core and carries ──
    X('tgu', 'Turkish get-up', 'Full Body', 'getup', 'kb', 'load', 'Shoulders, core', 'Hips, everything',
      ['Bell locked out over your shoulder, eyes on it.', 'Roll to elbow, hand, high bridge, sweep the leg, half-kneel, stand.', 'Reverse every step to the floor.'],
      ['Elbow bending.', 'Rushing the steps.', 'Support arm shrugged (watch the left shoulder).'], { side: true, q: 'turkish get up step by step' }),
    X('windmill', 'Bent-knee windmill', 'Core', 'windmill', 'kb', 'load', 'Obliques, hips', 'Shoulders, hamstrings',
      ['Bell overhead, feet turned away from it.', 'Push the hip out, bend both knees, slide your free hand down the inside of your leg.', 'Stand back up with the arm locked.'],
      ['Straight legs (that strained your adductor).', 'Losing the lockout.'], { side: true, q: 'kettlebell windmill bent knee' }),
    X('halo', 'Halo', 'Upper Body', 'halo', 'kb', 'care', 'Shoulders', 'Core, upper back',
      ['Hold the bell upside down by the horns.', 'Circle it around your head, close to the neck. Ribs stay down.'],
      ['Arching the back.', 'Circling far from the head.'], { q: 'kettlebell halo' }),
    X('atw', 'Around the world', 'Core', 'carry', 'kb', 'care', 'Core', 'Grip',
      ['Pass the bell around your waist, hand to hand.', 'Stay tall; switch direction each set.'],
      ['Hips swaying.', 'Dropping it.'], { q: 'kettlebell around the world' }),
    X('plank', 'Plank', 'Core', 'plank', 'bw', 'ok', 'Abs', 'Shoulders, glutes',
      ['Forearms down, body in one line from heels to head.', 'Squeeze your glutes and pull your ribs down.'],
      ['Hips sagging.', 'Holding your breath.'], { camera: 'plank', q: 'plank form' }),
    X('sideplank', 'Side plank', 'Core', 'plank', 'bw', 'care', 'Obliques', 'Hip abductors',
      ['On one forearm, feet stacked (or knees down to make it easier).', 'Lift your hips into a straight line.'],
      ['Hips drifting back.', 'Shoulder shrugging up.'], { side: true, q: 'side plank form' }),
    X('deadbug', 'Dead bug', 'Rehab', 'deadbug', 'bw', 'ok', 'Deep abs', 'Hip flexors',
      ['On your back, arms up, knees at 90°.', 'Lower the opposite arm and leg slowly while your lower back stays flat.'],
      ['Lower back lifting off the floor.', 'Moving fast.'], { q: 'dead bug exercise form' }),
    X('heeltap', 'Heel taps', 'Rehab', 'deadbug', 'bw', 'ok', 'Deep abs', 'Hip flexors',
      ['On your back, knees at 90°.', 'Tap one heel to the floor, return, switch. Back stays flat.'],
      ['Arching.', 'Rushing.'], { q: 'supine heel taps core' }),
    X('birddog', 'Bird dog', 'Rehab', 'birddog', 'bw', 'ok', 'Back extensors, glutes', 'Shoulders',
      ['Hands and knees. Reach one arm forward and the opposite leg back.', 'Hold 3 seconds without arching or twisting.'],
      ['Lifting the leg too high so the back arches.', 'Hips rotating.'], { side: true, q: 'bird dog exercise form' }),
    X('bear', 'Bear hold', 'Core', 'bear', 'bw', 'ok', 'Abs', 'Shoulders, quads',
      ['Hands and knees, then lift your knees 2 cm off the floor.', 'Back flat; breathe.'],
      ['Hips piking up.', 'Holding your breath.'], { q: 'bear plank hold' }),
    X('beardrag', 'Bear crawl drag', 'Core', 'bear', 'kb', 'care', 'Abs, shoulders', 'Obliques',
      ['Bear position with a bell beside you.', 'Reach under and drag it to the other side without your hips moving.'],
      ['Hips shifting.', 'Knees touching down.'], { side: true, q: 'bear crawl kettlebell pull through' }),
    X('stirpot', 'Stir-the-pot', 'Core', 'plank', 'bw', 'care', 'Abs', 'Shoulders',
      ['Forearms on a stability ball, plank position.', 'Draw small circles with your elbows without the hips moving.'],
      ['Big circles that pull the back into an arch.', 'Hips sagging.'], { q: 'stir the pot stability ball' }),
    X('farmer', 'Farmer carry', 'Full Body', 'carry', '2kb', 'ok', 'Grip, traps', 'Core, legs',
      ['A heavy bell in each hand, stand tall.', 'Walk slowly, shoulders down, no swinging bells.'],
      ['Leaning forward.', 'Rushing.'], { q: 'kettlebell farmer carry form' }),
    X('suitcase', 'Suitcase carry', 'Core', 'carry', 'kb', 'ok', 'Obliques', 'Grip',
      ['One bell in one hand. Stand tall and walk without leaning toward it.'],
      ['Leaning to the side.', 'Fast steps.'], { side: true, q: 'kettlebell suitcase carry' }),
    X('suitcasehold', 'Suitcase hold', 'Rehab', 'carry', 'kb', 'ok', 'Obliques', 'Grip',
      ['Stand still holding one bell by your side. Don’t lean toward it.'],
      ['Shoulder dropping.', 'Holding your breath.'], { side: true, q: 'kettlebell suitcase hold' }),
    X('rackcarry', 'Rack carry', 'Core', 'carry', '2kb', 'care', 'Core, upper back', 'Legs',
      ['Bells in the rack, ribs down.', 'Walk slowly without leaning back.'],
      ['Leaning back.', 'Elbows dropping.'], { q: 'double kettlebell rack carry' }),

    // ── Rehab and tendons ──
    X('breathing', '90/90 breathing', 'Rehab', 'supine', 'bw', 'ok', 'Diaphragm, deep abs', '—',
      ['On your back, feet on a wall, knees and hips at 90°.', 'Breathe out fully and let your ribs drop. 5 slow breaths.'],
      ['Arching off the floor.', 'Shallow breaths.'], { q: '90 90 breathing feet on wall' }),
    X('tilts', 'Pelvic tilts and knee rocks', 'Rehab', 'supine', 'bw', 'ok', 'Lower back mobility', '—',
      ['On your back, knees bent. Gently flatten and release the lower back.', 'Then let both knees rock side to side, small and pain-free.'],
      ['Forcing the range.', 'Moving into pain.'], { q: 'lying knee rocks lower back' }),
    X('clamshell', 'Clamshell', 'Rehab', 'sidelying', 'bw', 'ok', 'Glute medius', '—',
      ['On your side, knees bent, heels together.', 'Open the top knee without rolling the pelvis back.'],
      ['Rolling backward.', 'Rushing.'], { side: true, q: 'clamshell exercise form' }),
    X('adsqueeze', 'Adductor squeeze', 'Rehab', 'supine', 'bw', 'ok', 'Adductors', '—',
      ['On your back, knees bent, ball or pillow between them.', 'Squeeze at about 70% and hold.'],
      ['Squeezing so hard it pinches.', 'Holding your breath.'], { q: 'adductor ball squeeze supine' }),
    X('calfraise', 'Slow single-leg calf raise', 'Rehab', 'calf', 'bw', 'ok', 'Calves, Achilles', 'Foot',
      ['On one foot on a step, holding a rail.', '3 seconds up, 3 seconds down.'],
      ['Bouncing.', 'Rolling onto the outside of the foot.'], { side: true, q: 'slow single leg calf raise step' }),
    X('tibraise', 'Tibialis raise', 'Rehab', 'calf', 'bw', 'ok', 'Shins', 'Ankles',
      ['Back against a wall, heels a foot away.', 'Lift your toes as high as you can, lower slowly.'],
      ['Bending the knees.', 'Half range.'], { q: 'tibialis raise wall' }),
    X('erIso', 'Shoulder external rotation hold', 'Rehab', 'stand', 'bw', 'ok', 'Rotator cuff', '—',
      ['Elbow at 90° by your side, back of the hand against a doorframe.', 'Press out gently and hold.'],
      ['Elbow drifting away from the body.', 'Shrugging.'], { side: true, q: 'isometric shoulder external rotation doorway' }),
    X('shortfoot', 'Short-foot drill', 'Rehab', 'stand', 'bw', 'ok', 'Foot arch', '—',
      ['Barefoot. Pull the ball of the foot toward the heel without curling the toes, to lift the arch.', 'Hold 5 seconds.'],
      ['Curling the toes.', 'Lifting the big toe.'], { side: true, q: 'short foot exercise arch' }),
    X('wristcurl', 'Wrist curls', 'Rehab', 'stand', 'kb', 'ok', 'Forearms', 'Grip',
      ['Forearm on your thigh, seated. Light bell.', 'Curl the wrist up slowly, lower slowly. Then palm down.'],
      ['Heavy and jerky.', 'Lifting the forearm.'], { q: 'seated wrist curl reverse' }),
    X('rest', 'Rest', 'Rehab', 'stand', 'bw', 'ok', '—', '—', ['Walk around, breathe, shake out your hands.'], [], { q: 'active rest' })
  ];
  const BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
  const shorts = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' shorts').replace(/%20/g, '+');
  for (const e of EXERCISES) e.demo = shorts(e.q || e.name);

  // ── Glossary ──
  const GLOSSARY = [
    { group: 'Workout types', items: [
      ['EMOM', 'Every minute on the minute. Start the reps at the top of each minute and rest for what is left of it. When the minute runs out before you finish, the load or the reps are too high.'],
      ['AMRAP', 'As many rounds as possible. Repeat the list for the whole time cap, then log the rounds and extra reps.'],
      ['For time', 'Do all the work as fast as you can with good form. Your time is the score.'],
      ['Chipper', 'A long list done once, top to bottom, for time.'],
      ['Intervals', 'Fixed work and rest periods, such as 30 s on and 30 s off.'],
      ['Tabata', 'Intervals of 20 s work and 10 s rest, usually 8 rounds.'],
      ['Ladder', 'The reps rise and fall by a pattern, such as 5-10-15-10-5.'],
      ['Complex', 'Several moves back to back with the same bell, without putting it down.'],
      ['Circuit', 'Several moves done in turn, then repeated for rounds.'] ] },
    { group: 'In the workout', items: [
      ['Superset', 'Two exercises alternated with no rest between them. Both have the same number of sets.'],
      ['Max reps', 'As many clean reps as you can. Stop when form slips, not when you collapse.'],
      ['RPE', 'Rate of perceived effort from 1 to 10. RPE 8 means you had about 2 good reps left.'],
      ['Double progression', 'Add reps until you hit the top of the range on every set, then move up a bell and start again at the bottom.'],
      ['Green and Amber', 'Your check-in. Green uses the planned loads. Amber uses the lighter loads and the swaps, for days when your back or adductor is talking.'] ] },
    { group: 'Kettlebell terms', items: [
      ['Rack', 'The bell resting on the back of your forearm against your chest, wrist straight.'],
      ['Hike', 'Sending the bell back between your legs to start a swing or a clean.'],
      ['Hinge', 'Bending at the hips with a long spine. The hips go back, not down.'],
      ['Dead', 'Each rep starts from the floor with the bell still.'],
      ['Strict', 'No help from the legs.'],
      ['Push', 'A small dip and drive from the legs helps the press.'],
      ['Bottoms-up', 'The bell held upside down by the handle. It forces a strong grip and a stacked wrist.'],
      ['Double', 'Two bells at once.'],
      ['Alt', 'Alternate sides every rep.'] ] }
  ];

  // ── Workouts ──
  // Same file format as the coaching project (repcoach.workout/v1). Items point at the library with `ex`.
  // Extra format types: amrap (capSec), fortime (rounds, capSec), intervals (workSec, restSec, rounds).
  // emom with rotate:true gives each minute one item (minute 1 = item 1, minute 2 = item 2…).
  const I = (ex, reps, load, more = {}) => ({ ex, reps, load, ...more });
  const W = (id, title, focus, level, durationMin, sections, more = {}) =>
    ({ schema: 'repcoach.workout/v1', id, title, focus, level, durationMin, sections, ...more });
  const sec = (id, title, format, items, more = {}) => ({ id, title, format, items, ...more });
  const warmBack = sec('warm', 'Warm-up', { type: 'straight' }, [
    I('breathing', '5 breaths', null, { sets: 1 }), I('deadbug', '6/side', null, { sets: 1 }), I('birddog', '6/side', null, { sets: 1 })]);
  const warmKB = sec('warm', 'Warm-up', { type: 'circuit', rounds: 2, restAfterRoundSec: 30 }, [
    I('halo', '5 each way', { green: '8 kg' }), I('prying', null, { green: '12 kg' }, { durationSec: 30 }), I('kbdl', 8, { green: '16 kg' }), I('swing', 10, { green: '16 kg', amber: 'KB deadlift' }, { swap: { amber: 'Kettlebell deadlift' } })]);

  const WORKOUTS = [
    // Back-safe now: nothing loads the spine
    W('rehab-core', 'Back Calm: Core Control', 'Core', 'Rehab', 15, [
      sec('main', 'Control circuit', { type: 'circuit', rounds: 2, restAfterRoundSec: 45 }, [
        I('breathing', '5 breaths', null), I('heeltap', '8/side', null), I('bear', null, null, { durationSec: 15 }),
        I('suitcasehold', null, { green: '12 kg' }, { durationSec: 30, perSide: true }), I('clamshell', '12/side', null), I('splitiso', null, null, { durationSec: 20, perSide: true })])
    ], { back: 'ok', description: 'Fifteen minutes of control work that never loads your spine. Good on any day the back is talking.' }),
    W('rehab-tendon', 'Tendon Builder', 'Full Body', 'Rehab', 15, [
      sec('main', 'Slow holds', { type: 'circuit', rounds: 3, restAfterRoundSec: 45 }, [
        I('wallsit', null, null, { durationSec: 40 }), I('calfraise', '8/leg', null), I('adsqueeze', null, null, { durationSec: 20 }),
        I('erIso', null, null, { durationSec: 20, perSide: true }), I('tibraise', 15, null), I('wristcurl', 12, { green: '4–8 kg' })])
    ], { back: 'ok', description: 'Isometrics and slow reps for the calves, knees, adductors, shoulders and wrists, three times a week.' }),
    W('upper-supported', 'Upper Body, Back Supported', 'Upper Body', 'Rehab', 12, [
      sec('main', 'Giant set', { type: 'circuit', rounds: 3, restAfterRoundSec: 45 }, [
        I('csrow', 10, { green: '2×16 kg' }), I('floorpress', 10, { green: '2×16 kg' }, { cue: '3 seconds down.' }), I('inclinecurl', 10, { green: '2×8 kg' }), I('triext', 12, { green: '12 kg' })]),
      sec('fin', 'Finisher', { type: 'straight' }, [I('erIso', null, null, { sets: 1, durationSec: 30, perSide: true })])
    ], { back: 'ok', description: 'Every move is seated, lying down or chest-supported, so your lower back rests while your upper body works.' }),
    W('emom-upper-safe', 'Seated Pump EMOM', 'Upper Body', 'Rehab', 16, [
      sec('main', '16 min EMOM', { type: 'emom', intervalSec: 60, rounds: 4, rotate: true }, [
        I('csrow', 10, { green: '2×16 kg' }), I('floorpress', 10, { green: '2×16 kg' }), I('inclinecurl', 10, { green: '2×8 kg' }), I('inclinepu', 12, null)])
    ], { back: 'ok', description: 'A minute per move, four rounds. Rest for whatever is left of each minute.' }),

    // Return to bells (after the physio's go-ahead)
    W('hinge-school', 'Hinge School', 'Legs', 'Beginner', 25, [
      warmBack,
      sec('main', 'Patterning', { type: 'straight' }, [
        I('kbdl', 8, { green: '16 kg', amber: '12 kg' }, { sets: 3, restSec: 60, cue: 'Film one set from the side.' }),
        I('boxsquat', 8, { green: '12 kg' }, { sets: 3, restSec: 60 }), I('suitcase', '20 m/side', { green: '16 kg' }, { sets: 3, restSec: 45 })]),
      sec('core', 'Core', { type: 'straight' }, [I('bridge', 12, null, { sets: 2, restSec: 30 }), I('sideplank', null, null, { sets: 2, durationSec: 20, perSide: true, restSec: 30 })])
    ], { back: 'care', description: 'Your first sessions back with a bell: slow deadlifts and box squats to re-groove the hinge before any swings.' }),
    W('swing-intro', 'Swing Re-entry', 'Full Body', 'Beginner', 25, [
      warmBack,
      sec('main', '10 min EMOM', { type: 'emom', intervalSec: 60, rounds: 10 }, [I('swing', 10, { green: '12 kg', amber: 'KB deadlift' }, { swap: { amber: 'Kettlebell deadlift' } })],
        { description: 'Ten crisp swings at the top of every minute. Stop any set that turns into a squat.' }),
      sec('fin', 'Carry', { type: 'straight' }, [I('farmer', '30 m', { green: '2×16 kg' }, { sets: 3, restSec: 45 })])
    ], { back: 'load', description: 'Light, crisp swings with lots of rest. Do it only once deadlifts have felt fine for a week.' }),

    // Full kettlebell sessions
    W('kb-power', 'KB Power', 'Full Body', 'Advanced', 55, [
      warmKB,
      sec('armor', 'A · Armor Builder', { type: 'emom', intervalSec: 60, rounds: { green: 10, amber: 8 } }, [
        I('dclean', 2, { green: '2×16 kg', amber: '2×12 kg' }), I('dpress', 1, { green: '2×16 kg', amber: '2×12 kg' }), I('dfsq', 3, { green: '2×16 kg', amber: '1 bell' }, { swap: { amber: 'Goblet squat' } })],
        { description: 'Every minute: 2 double cleans, 1 double press, 3 double front squats.' }),
      sec('pyramid', 'B · Swing pyramid', { type: 'ladder', scheme: [5, 10, 15, 10, 5], pairWith: 'farmer', restAfterPairSec: 40 }, [
        I('swing', null, { green: '16 kg', amber: 'KB deadlift' }, { swap: { amber: 'Kettlebell deadlift' } }), I('farmer', '20 m', { green: '2×20 kg', amber: '2×16 kg' })])
    ], { back: 'load', checkIn: true, description: 'Your 18 Oct session. Heavy doubles every minute, then a swing ladder with carries.' }),
    W('emom-full-40', 'Double Trouble EMOM', 'Full Body', 'Advanced', 40, [
      warmKB,
      sec('main', '40 min EMOM', { type: 'emom', intervalSec: 60, rounds: 5, rotate: true }, [
        I('dfsq', '6-8', { green: '2×16 kg', amber: '1 bell' }, { swap: { amber: 'Goblet squat' } }), I('drdl', '6-8', { green: '2×16 kg', amber: '2×12 kg' }),
        I('dswing', '10-12', { green: '2×16 kg', amber: '1×16 kg' }, { swap: { amber: 'Two-hand swing' } }), I('plank', null, null, { durationSec: 30 }),
        I('clean', '6-8/side', { green: '16 kg' }), I('press', '6-8/side', { green: '16 kg' }), I('swing', '16-20', { green: '20 kg', amber: '16 kg' }), I('bear', null, null, { durationSec: 30 })])
    ], { back: 'load', checkIn: true, description: 'Eight moves, one per minute, five rounds. Heavy doubles, cleans and presses, swings and core holds.' }),
    W('amrap-20', 'Engine AMRAP', 'Full Body', 'Intermediate', 25, [
      warmKB,
      sec('main', '20 min AMRAP', { type: 'amrap', capSec: 1200 }, [
        I('swing', 15, { green: '16 kg' }), I('goblet', 10, { green: '16 kg' }), I('pushup', 10, null), I('row', '8/side', { green: '16 kg' })])
    ], { back: 'load', description: 'As many rounds as you can in 20 minutes. Log your rounds; beat them next time.' }),
    W('chipper', 'The Chipper', 'Full Body', 'Intermediate', 30, [
      warmKB,
      sec('main', 'For time (cap 25 min)', { type: 'fortime', rounds: 1, capSec: 1500 }, [
        I('swing', 50, { green: '16 kg' }), I('goblet', 40, { green: '16 kg' }), I('pushup', 30, null), I('clean', '20/side', { green: '16 kg' }), I('press', '10/side', { green: '16 kg' }), I('farmer', '100 m', { green: '2×20 kg' })])
    ], { back: 'load', description: 'One long list, top to bottom, as fast as your form allows.' }),
    W('tabata-bells', 'Bell Tabata', 'Full Body', 'Intermediate', 20, [
      warmKB,
      sec('main', 'Tabata × 2', { type: 'intervals', workSec: 20, restSec: 10, rounds: 16 }, [I('swing', null, { green: '16 kg' }), I('goblet', null, { green: '12 kg' })])
    ], { back: 'load', description: '20 seconds on, 10 off, alternating swings and goblet squats for 8 minutes.' }),
    W('complex-gauntlet', 'Bottoms-Up Gauntlet', 'Upper Body', 'Advanced', 25, [
      sec('main', 'Complex', { type: 'complex', rounds: 3, perSide: true, sideRestSec: 20, restAfterRoundSec: 60 }, [
        I('clean', 3, { green: '12 kg' }, { perSide: true }), I('bupress', 3, { green: '12 kg' }, { perSide: true }), I('revlunge', 3, { green: '12 kg' }, { perSide: true }), I('beardrag', 6, { green: '16 kg' })])
    ], { back: 'load', description: 'Clean, press, lunge without putting the bell down. Then the other side.' }),
    W('pull-skill', 'Pull Skill', 'Upper Body', 'Intermediate', 35, [
      sec('main', 'Pull ladder', { type: 'straight' }, [
        I('negative', 3, null, { sets: 4, restSec: 120, cue: '5 seconds down.' }), I('suspRow', 10, null, { sets: 3, restSec: 60 })]),
      sec('ss', 'Superset', { type: 'circuit', rounds: 3, restAfterRoundSec: 60 }, [I('gorilla', '8/side', { green: '2×16 kg', amber: 'chest-supported' }, { swap: { amber: 'Chest-supported row' } }), I('curl', 10, { green: '12 kg' })]),
      sec('fin', 'Finisher', { type: 'straight' }, [I('feethang', null, null, { sets: 2, durationSec: 30, restSec: 30 })])
    ], { back: 'care', description: 'Negatives, rows and curls. Feet-supported hangs only until the back is cleared.' }),
    W('getup-practice', 'Get-up Practice', 'Full Body', 'Intermediate', 25, [
      sec('main', 'Get-ups', { type: 'straight' }, [I('tgu', '1/side', { green: '16 kg' }, { sets: 5, restSec: 60, cue: 'Watch the left support arm: shoulder down, hand under the shoulder.' })]),
      sec('mob', 'Mobility', { type: 'circuit', rounds: 2 }, [I('halo', '5 each way', { green: '8 kg' }), I('windmill', '5/side', { green: '8 kg' })])
    ], { back: 'load', description: 'Slow, perfect get-ups, then halos and bent-knee windmills.' })
  ];

  // ── Programs ──
  // Days reference workouts by id. `week` can tweak a workout (rounds, reps, load) through `mods`.
  const PROGRAMS = [
    { id: 'back-to-bells', name: 'Back to Bells', level: 'Rehab → Intermediate', weeks: 5,
      description: 'Your route back from the 18 Oct back strain. Week 0 is what you can do now. Weeks 1–4 start only after the physio clears you, and each week adds load only if the last one felt fine the next morning.',
      gate: 'Weeks 1–4 need the physio’s go-ahead.',
      schedule: [
        { week: 0, title: 'Calm', days: ['rehab-core', 'upper-supported', 'rehab-tendon', 'emom-upper-safe'] },
        { week: 1, title: 'Re-groove', days: ['hinge-school', 'upper-supported', 'rehab-tendon'] },
        { week: 2, title: 'Swings back', days: ['hinge-school', 'swing-intro', 'pull-skill'] },
        { week: 3, title: 'Build', days: ['swing-intro', 'pull-skill', 'getup-practice'] },
        { week: 4, title: 'Test', days: ['amrap-20', 'pull-skill', 'complex-gauntlet'] } ] },
    { id: 'bell-engine', name: 'Bell Engine', level: 'Intermediate → Advanced', weeks: 4,
      description: 'Four weeks of kettlebell conditioning: EMOMs, an AMRAP to re-test, a chipper and Tabata. For when you are fully cleared.',
      schedule: [
        { week: 1, title: 'Base', days: ['amrap-20', 'pull-skill', 'tabata-bells'] },
        { week: 2, title: 'Doubles', days: ['emom-full-40', 'getup-practice', 'complex-gauntlet'] },
        { week: 3, title: 'Heavy', days: ['kb-power', 'pull-skill', 'chipper'] },
        { week: 4, title: 'Re-test', days: ['amrap-20', 'getup-practice', 'emom-full-40'] } ] }
  ];

  const api = { EXERCISES, BY_ID, GLOSSARY, WORKOUTS, PROGRAMS, shorts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RepLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
