# Git Neck

Git Neck is a local macOS desktop app for fretboard note mastery. The current loop is:

```text
prompt -> app listens to guitar -> detects pitch class -> score -> feedback -> update mastery -> next prompt
```

## Current Build Includes

- Electron + React + TypeScript app shell
- Standard tuning, right-handed, open-12 fretboard model
- Note-only prompts in non-curriculum modes and guided-string note prompts in Daily Workout
- Microphone listening through the computer
- Simple monophonic pitch-class detection
- Stable-note scoring gate to avoid counting pick attack transients as attempts
- Conservative session-relative tuning tolerance
- Deterministic scoring and canned coaching
- Practice Ready screen so the timer and microphone do not start until `Start Practice`
- Continuous microphone flow during Practice
- Background scoring that stays out of the way during Practice
- Compact prompt-adjacent feedback showing correct/missed/too-slow/locked results while practicing
- String-lane prompt display: six stable string lanes, highlighted target string, and a large target-note badge without fret locations
- Curriculum focus sets in Daily Workout, visible in Practice
- Training-rationale explanations in Progress and Session Complete, kept out of active playing
- Auto-advance after a scored note
- Tiger Mode default-on: misses and too-slow hits repeat the same prompt until clean
- Idle-silence forgiveness so quiet breaks over 5 seconds are ignored by the response timer
- Clean streak, slow-answer, and repeated-mistake handling
- Pause/resume so breaks do not count against response time
- Session structures: `1 x 15`, `3 x 5`, or `5 x 3`
- Completed session trends
- Curriculum position in Progress: level, current string lane, current note set, and clean-pass progress
- Local usage tracking with active, completed, and interrupted session status
- Empty-session suppression so Progress does not get zero-attempt rows
- Session Complete summary after ending a practice window, with explicit next choices instead of silently starting over
- Basic mastery tracking and diagnosis-aware workout prompt weighting
- Small focus-group progression for note mastery: naturals begin with `C, G, D`, then `A, E`, then `F, B`; sharps/flats enter in small groups
- Curriculum research brief in `CURRICULUM_RESEARCH.md`
- Trey Anastasio vocabulary research and six-week curriculum in `TREY_ANASTASIO_CURRICULUM.md`
- Pure training diagnosis module for skill states, repeated confusions, slow recall, retention review, and practice prescriptions
- Daily Workout uses training diagnosis to prioritize weak accuracy, slow recall, repeated confusions, and retention review inside the current focus set
- Daily Workout is always string-specific, so curriculum practice does not mix target strings with `Any string`
- Guided-string Daily Workout prompts use a single-string recall lane: one focus string until 3 clean guided passes, then the next string
- Local JSON persistence through Electron IPC
- Practice, Progress, Trey Lab, and Settings / Debug areas
- Trey Lab with sourced Anastasio-style vocabulary cards, original motif studies, root transposition, listening assignments, and tone notes
- Debug-only simulated note input
- Settings-only microphone diagnostics for validating target/heard/frequency/cents/stable-time evidence
- Unit and Electron UI workflow tests

## Intentionally Deferred

- Polished tuner-grade pitch detection
- Calibration wizard and input-device selection
- Automatic physical string/fret detection
- Intervals, chord tones, scales, songs, backing tracks, ear training
- Full integration between Trey Lab motifs and microphone-scored note prompts
- LLM coaching or spoken coach
- Advanced analytics and heatmaps
- Packaging, signing, notarization, accounts, backend, cloud, mobile, web deployment

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Test

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Practice Flow

1. Review the Practice Ready screen.
2. Press `Start Practice` when your hands are on the guitar.
3. Grant microphone permission if macOS asks.
4. Read the prompt and play one clear guitar note into this computer's input.
5. The app detects a stable pitch class, applies the current session's conservative tuning offset, and scores automatically.
6. Git Neck shows the immediate result next to the prompt, advances automatically after a pass, or repeats the same prompt after a miss/slow hit.
7. Use `Pause` when you stop for a text or interruption; quiet idle gaps over 5 seconds are also excluded from response timing.
8. Use `Turn mic on`, `Repeat`, `Next`, or `End session` as manual overrides.
9. Ending a session stops practice and shows a Session Complete summary. Start another session only when you explicitly choose to.

## Trey Lab

Use `Trey Lab` for Trey Anastasio-style vocabulary practice. It contains sourced, original studies for groups of four, thirds, chromatic cells, diminished tension, arpeggio spines, modal pivots, Stash-style tension/release, Divided Sky sustain, and Reba-style peak building.

The note sequences are generated from interval patterns and can be transposed by root. They are teaching studies, not copied solo transcriptions.

## Session Options

Use Settings / Debug to choose:

- `1 x 15 minutes`
- `3 x 5 minutes`
- `5 x 3 minutes`

Paused time does not count toward the prompt response timer or active session time.

## Keyboard Shortcuts

- `Space` = start practice from the ready screen, then turn mic on/off during practice
- `R` = repeat prompt
- `Enter` = start practice from the ready screen; during practice, next if feedback is showing, otherwise start listening
- In Tiger Mode, `Enter`/`Next` cannot skip a missed prompt.
- `Esc` = pause/resume timer and stop listening

## Known Limitations

- Pitch detection is intentionally simple and monophonic, but now waits for stable pitch before scoring.
- Loud rooms, chords, low input gain, attack noise, or sustained overtones may still confuse detection.
- Normal microphone input validates pitch, not the physical fret or string.
- Guided-string prompts say where to play, but the mic cannot prove the string/fret by itself.
- Daily Workout guided-string practice is intentionally string-lane based so curriculum sessions stay structured.
- Active Practice does not show fretboard answer locations; the lane is a prompt cue, not a fret map.
- Detailed score/result data is intentionally kept out of the Practice view and shown in Progress/history instead.
- Practice should not require clicking before every note; the mic restarts automatically between prompts.
- Tiger Mode is default-on; turn it off in Settings only if you intentionally want softer practice behavior.
- Silence-based break detection only works when the room/input is actually quiet; noisy rooms can still create detections.
- Session tuning offset is conservative, learned over multiple accepted notes, and reset per session.
- Simulated input exists only under Settings / Debug.
- Persistence is a single local JSON state file.
- Usage tracking is local-only; there is no analytics backend or cloud telemetry.
- Audio diagnostics are local-only and exist to debug detection quality.
- Daily Workout adaptation is intentionally simple and conservative; it is not a full intelligent tutor yet.
- `npm install` reported dependency audit findings from the installed third-party tree.

## Verification Status

- `npm install`: passed.
- `npm test`: passed, 75 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: not completed in this sandbox run; Electron launched but stalled before the first workflow assertion.
- `npm run dev`: launched with approved localhost permissions and returned `HTTP 200` on `http://localhost:5173/` during verification, then was stopped.
