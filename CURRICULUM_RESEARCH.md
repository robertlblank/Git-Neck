# Git Neck Curriculum Research

## Status

This is a working research brief, not a locked curriculum. It exists so Git Neck's training system is built from explicit learning principles instead of accidental prompt randomization.

## Core Product Question

Git Neck is not trying to teach all guitar. It is trying to make fretboard note recall automatic enough that a guitarist can find notes without conscious search. The curriculum therefore needs to model:

- what the player can recall accurately
- what the player can recall quickly
- what the player can recall after delay
- where the player confuses neighboring or enharmonic notes
- where the player knows a pitch class globally but not on specific strings or regions
- when the player should repeat, review, expand, or slow down

## What Great Guitar Teachers Tend To Do

The best guitar teachers do not only say "memorize the fretboard." They break the neck into learnable reference systems, force recall in context, and connect abstract note names to physical locations.

Important patterns:

- They start from anchors: open strings, octave shapes, string pairs, position markers, CAGED-like landmarks, and familiar chord/scale shapes.
- They move from local to global: one string or small fret region first, then adjacent strings, then cross-neck recall.
- They demand retrieval, not recognition: the student has to produce the note, not just look at a diagram.
- They mix blocked and varied practice: blocked practice builds the first map; mixed prompts prove the map survives real playing.
- They treat mistakes diagnostically: "you confuse F and F#" is different from "you know C but only on the A string."
- They keep the player physically honest: guitar has multiple places for the same pitch class, so knowing the note means knowing locations, not just names.

Guitar-specific constraints:

- Standard notation often leaves string choice implicit, while tablature explicitly maps music to string/fret locations. That means a guitarist's knowledge problem is spatial as much as verbal.
- The same pitch can be played in multiple places. Classical guitar pedagogy calls this registration: choosing where on the guitar to play a note based on fingering, tone, continuity, and musical context.
- Normal microphone pitch detection can verify the heard pitch class, but cannot prove the string/fret without specialized audio/tab inference. Git Neck must stay honest about that.

## What The Best Musicians Are Best At

The best musicians are not merely fast at isolated facts. They are fast at chunking, prediction, recovery, and transfer.

For Git Neck, that means:

- **Instant retrieval:** note names map to hands without visible search.
- **Chunking:** notes are grouped into string patterns, octave relationships, chord tones, scale fragments, and positions.
- **Audiation:** the player can anticipate what a note should sound like before playing it.
- **Error recovery:** a miss is noticed and corrected quickly.
- **Transfer:** the same note can be found across strings, positions, tempos, and musical contexts.
- **Low cognitive load:** basic note finding becomes cheap enough that attention can move to phrasing, rhythm, tone, and improvisation.

## Learning Science That Should Drive The App

### Deliberate Practice

Deliberate practice emphasizes specific goals, tasks just beyond current ability, repetition, and immediate feedback. For Git Neck, this means every prompt should be tied to a known skill target and every attempt should update a diagnosis.

Implementation implication:

- Each prompt must map to a skill atom.
- Feedback should be immediate and short.
- Weak skills should reappear until stable.
- The app should avoid broad random prompting when a narrower weakness is known.

### Mastery Learning

Mastery learning says students should demonstrate sufficient competence on prerequisites before moving on. For Git Neck, "move on" should require accuracy, speed, and retention, not just one correct answer.

Implementation implication:

- A skill is not ready after one pass.
- A skill needs a minimum attempt count, recent accuracy, response-time threshold, clean streak, and delayed review.
- If a skill fails after delay, it returns to active practice.

### Retrieval Practice And Spacing

Fretboard mastery is a retrieval problem. The app should ask the player to produce notes from memory and should schedule review over time. Newer and weaker items should appear more frequently; older stronger items should still return.

Implementation implication:

- Daily mix should be approximately current weak skills, review skills, and expansion skills.
- Skills should have due dates or at least "last seen" pressure.
- Session-to-session trends matter more than one-session success.

### Interleaving And Contextual Interference

Blocked practice feels good but can overstate mastery. Interleaving feels harder but supports transfer. For Git Neck, early learning should be partially blocked, then gradually mixed.

Implementation implication:

- Start a concept in a small set.
- Mix within the set.
- Then mix old and new sets.
- Then test across strings/regions.

### Intelligent Tutoring / Student Modeling

Modern tutoring systems commonly separate:

- domain model: what can be learned
- student model: what the learner currently knows
- tutoring model: what to do next
- interface model: how to present it

Git Neck should follow this shape. The current app has pieces of this, but not a full model yet.

Implementation implication:

- `curriculum` should define skills and prerequisites.
- `training` should diagnose skill states.
- `workout` should prescribe prompts from diagnosis.
- React should display the decision, not own the decision.

## Modern 2021-2026 Research / Product Lessons

### Adaptive Support And Self-Regulated Learning

Recent work on self-regulated learning systems emphasizes goal setting, strategy execution, and reflection. New LLM-assisted systems show promise when they scaffold these behaviors, but the lesson for Git Neck v0.1 is not "add an LLM." The lesson is to make the app help the player know:

- what the goal is today
- what strategy is being used
- what changed after the session
- what to do next

Implementation implication:

- Session start should say the focus: e.g. "C/G/D across open-12."
- Session end should say what improved, what stayed weak, and what next session will do.
- Avoid vague scores. Use actionable labels: `accuracy`, `speed`, `retention`, `string coverage`.

### Gamification Can Help Or Distort

Modern learning apps use streaks, points, levels, leagues, and daily reminders because motivation is the hard part. But research on gamification misuse shows that users can optimize for the game instead of the learning.

Implementation implication:

- Do not make XP the core reward.
- Do use streaks or completion cues only when they reinforce real practice.
- Prefer "you improved B-string C recall" over "you earned 500 points."
- Never let users game progress by skipping hard prompts.

### Sustained Motivation

Recent self-determination-theory reviews argue that behavior-change products often optimize engagement with the app rather than internalizing the user's real goal. For Git Neck, the goal is not "use Git Neck." The goal is "become the kind of guitarist who knows the neck cold."

Implementation implication:

- Give autonomy: session length and mode choices matter.
- Build competence: make progress legible and specific.
- Respect identity: use direct coach language, not infantilizing game language.
- Reduce friction: mic starts automatically, pauses are fair, sessions are logged.

### AI Caution

Recent user backlash around AI learning features shows a trust problem: if feedback is wrong, vague, or replaces expert explanation, users lose confidence. Git Neck should keep deterministic coaching until the domain model is strong.

Implementation implication:

- No LLM coaching in v0.1.
- If AI ever enters, it should explain patterns from verified local data, not invent pedagogy.

## Why People Keep Using A Learning App

Likely retention drivers for Git Neck:

- The app hears the guitar reliably.
- Practice starts fast.
- The user knows exactly what to do next.
- Feedback appears where the eyes already are.
- The app is fair about interruptions.
- Progress is specific and believable.
- The app adapts enough to feel personal.
- Sessions end with a clear sense of "that counted."
- The user can feel the skill transferring to real playing.

## Why People Abandon A Learning App

Likely abandonment triggers:

- Detection feels unfair.
- The app makes the user click too much.
- The app feels random.
- The user cannot tell whether progress is real.
- The app punishes real life interruptions.
- The app advances after wrong answers.
- The app uses generic motivational fluff instead of useful coaching.
- The app over-gamifies and makes the user chase points.
- The app gets too broad too early.
- The app claims more than it can verify.

## Proposed Git Neck Skill Model

Git Neck should model skill atoms at several levels:

### Pitch Class Recall

Example:

```text
skill: pitch_class:C
```

Measures:

- attempts
- pass rate
- wrong-note confusions
- average response time
- clean streak
- delayed review success

### String-Specific Recall

Example:

```text
skill: string_pitch:B:C
```

Meaning:

- prompt asks for C on B string
- mic verifies C only
- app records that the prompt intended B string
- user is trusted to follow the prompt in v0.1

Measures:

- same as pitch class recall
- per-string coverage
- string-specific slowness

### Region Recall

Example:

```text
skill: region:frets_0_4:C
```

This should come after v0.1 if the app asks for fret regions. It should not claim to verify fret unless the prompt constrains the task and the user follows it.

### Confusion Pair

Example:

```text
skill: confusion:C:B
skill: confusion:F:F#/Gb
```

A confusion pair should trigger contrast practice: alternate the target and the common miss deliberately.

### Retention

Example:

```text
skill: retention:C:24h
```

A note is not mastered until it survives delay.

## Proposed Skill States

Each skill should move through:

```text
unseen -> introduced -> learning -> accurate -> automatic -> retained
```

Failure states:

```text
weak_accuracy
slow_recall
repeated_confusion
retention_failed
under_sampled
```

## Proposed Daily Workout Generator

Daily Workout should not be random. It should generate from diagnosis:

```text
60% current weak / active skill
25% spaced review
15% expansion
```

Rules:

- If Tiger Mode is locked, repeat the failed skill until clean.
- If a skill is wrong, prioritize accuracy before speed.
- If a skill is correct but slow, keep it in the active pool with speed pressure.
- If a skill is accurate and fast, schedule delayed review.
- If a skill passes delayed review, expand the curriculum.
- If a specific wrong note repeats, create a contrast-practice micro-block.

## Proposed Curriculum Shape

This is a hypothesis to test:

1. Natural note anchors
   - C, G, D
   - A, E
   - F, B
2. Natural notes by string pair
   - low E / high E
   - A / D
   - G / B
3. Accidentals as neighboring notes
   - F#/Gb next to F/G
   - C#/Db next to C/D
   - G#/Ab next to G/A
   - D#/Eb next to D/E
   - A#/Bb next to A/B
4. Full chromatic recall
5. Guided-string recall
6. Region/position constraints
7. Speed and pressure
8. Retention maintenance

Open issue:

- Guided-string recall may need to enter earlier than step 5 if global pitch-class recall becomes too abstract. The app should test this with usage data.

## What To Build Next

1. Add a pure `training` domain module.
2. Define skill IDs and skill assessment functions.
3. Add tests for diagnosis:
   - unseen
   - weak accuracy
   - slow recall
   - repeated confusion
   - automatic
   - retention failed
4. Change `workout` to select prompts from training prescription, not directly from raw mastery.
5. Show the current skill target in Practice and Progress.
6. Keep all coaching deterministic.

## Sources

- K. Anders Ericsson, Ralf Krampe, Clemens Tesch-Römer, "The Role of Deliberate Practice in the Acquisition of Expert Performance" (Psychological Review, 1993): https://en.wikipedia.org/wiki/K._Anders_Ericsson
- Deliberate practice criteria summary: https://en.wikipedia.org/wiki/Practice_%28learning_method%29
- Mastery learning / Bloom model: https://en.wikipedia.org/wiki/Mastery_learning
- Retrieval and spaced repetition overview: https://en.wikipedia.org/wiki/Spaced_repetition
- Distributed practice overview: https://en.wikipedia.org/wiki/Distributed_practice
- Varied practice / interleaving / contextual interference overview: https://en.wikipedia.org/wiki/Varied_practice
- Intelligent tutoring system architecture and knowledge tracing concepts: https://en.wikipedia.org/wiki/Intelligent_tutoring_system
- DAS3H adaptive student learning/forgetting model (2019): https://arxiv.org/abs/1905.06873
- SRLAgent, modern self-regulated learning + gamification + adaptive support (2025): https://arxiv.org/abs/2506.09968
- Designing for sustained motivation with self-determination theory in behavior-change technologies (2024): https://arxiv.org/abs/2402.00121
- Gamification misuse in language-learning apps (2022): https://arxiv.org/abs/2203.16175
- Duolingo overview, app reception, gamification and criticism: https://en.wikipedia.org/wiki/Duolingo
- Rocksmith+ overview, real-instrument feedback model: https://en.wikipedia.org/wiki/Rocksmith%2B
- Yousician overview, real-time audio feedback model: https://en.wikipedia.org/wiki/Yousician
- Simply / Simply Guitar overview, structured lessons and real-time feedback: https://en.wikipedia.org/wiki/Simply_%28software_company%29
- Classical guitar technique, registration and string/fret notation constraints: https://en.wikipedia.org/wiki/Classical_guitar_technique
- Guitar tab as explicit string/fret mapping: https://www.musicradar.com/tutorials/guitar-lessons-techniques/confused-by-guitar-tabs-and-notation-use-this-complete-guide-to-reading-music-for-guitar
- MIDI-to-Tab guitar string/fret assignment complexity (2024): https://arxiv.org/abs/2408.05024
- TART audio-to-tab guitar transcription challenges (2025): https://arxiv.org/abs/2510.02597
- Sight-reading, chunking, audiation and expert pattern recognition: https://en.wikipedia.org/wiki/Sight-reading
