# PROJECT_STATE

## Current Milestone

Audio-first Git Neck v0.1: prove the learning loop using this computer's microphone, with fair pause/session handling.

## Resume Protocol

If conversation context is lost or compacted, resume from these files in order:

1. `DECISIONS.md`
2. `PROJECT_STATE.md`
3. `TEST_REPORT.md`
4. `NEXT_SESSION.md`
5. `README.md`
6. `CURRICULUM_RESEARCH.md`

Then run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Do not rely on chat memory when the files disagree with memory. The files are the source of truth.

## What Works

- Electron + React + TypeScript app scaffold.
- Practice area with prompt, start/stop listening, microphone status, detected note display, scoring, feedback, streak, timer, repeat, next, end session, and fretboard reveal.
- Practice automatically starts/restarts microphone listening between prompts; no per-note click-through is required.
- Practice hides detailed score/result widgets while playing; scoring happens in the background.
- Practice shows a compact prompt-adjacent result badge: `Correct`, `Missed`, `Too slow`, or `Locked until clean`, including the heard note when available.
- Practice shows the active curriculum focus set in the session strip.
- Progress and Session Complete show why Git Neck is choosing the next focus, such as contrast work, accuracy work, speed work, or retention review.
- Auto-advance moves to the next prompt after correct answers and repeats after wrong/slow answers.
- Tiger Mode is default-on and enforces the same prompt after a miss or too-slow answer until the user gets it right.
- Pause/resume excludes break time from response scoring and active session time.
- Idle silence over 5 seconds is excluded from response timing so quiet interruptions do not become slow attempts.
- Session structures support `1 x 15`, `3 x 5`, and `5 x 3`.
- Completed session trends show session accuracy, average response time, attempt count, and active duration.
- Sessions are now persisted while active, marked completed on `End session`, and recovered as interrupted on next launch if the app stopped mid-session.
- Empty sessions are not saved to Progress when `End session` is clicked without attempts.
- `End session` now shows a deliberate Session Complete state with attempts, accuracy, average response, active duration, misses, slow answers, next focus, and choices to start another session, review progress, or change session type.
- Conservative session tuning offset learns slowly from accepted target notes and resets each session.
- Microphone scoring now waits for a pitch to remain stable before submitting an attempt, so pick attack transients are less likely to count as wrong notes.
- Pitch estimation now uses a more conservative YIN-style detector instead of the earlier rough autocorrelation peak picker.
- Daily Workout uses curriculum focus groups instead of the whole level at once: natural notes start with `C, G, D`, then move to `A, E`, then `F, B`; sharps/flats are introduced in small groups.
- Daily Workout now uses training diagnosis inside the available focus set: repeated confusions, weak accuracy, slow recall, and retention-due notes can bias the next prompt.
- `CURRICULUM_RESEARCH.md` defines the current research-backed direction for training methodology, including modern app retention risks and learning-science principles.
- Progress area with current level, weakest notes, strongest notes, slowest notes, recent attempts, session trends, and next workout focus.
- Settings / Debug area with workout length, fret range, session structure, Tiger Mode, reveal default, active input mode, force unlock, state file path, recent attempts, and debug-only simulated note input.
- Pure domain modules for notes, fretboard, audio helpers, sessions, drills, scoring, coaching, mastery, curriculum, workout, and training diagnosis.
- Training diagnosis can assess pitch-class, string-pitch, and repeated-confusion skills as `unseen`, `introduced`, `weak_accuracy`, `slow_recall`, `repeated_confusion`, `retention_failed`, `accurate`, or `automatic`, then prescribe active/review/contrast/expand practice.
- Local JSON persistence through Electron main/preload IPC.
- Unit tests and Electron UI workflow tests pass.
- Project folder is `/Users/robertblank/Guitar Gear Codex/git-neck`.
- Stop Listening blank-screen bug is fixed and covered by E2E regression.
- Practice no longer shows the score/result panel while playing; covered by E2E regression.
- Continuous microphone flow is covered by E2E regression.
- Old v1 persisted state migrates Tiger Mode to on, so prior local defaults do not silently keep skip-friendly behavior.

## Known Facts

- The built Electron app loads the emitted preload file at `out/preload/index.cjs`.
- Local persistence is through Electron IPC to `git-neck-state.json`.
- E2E tests use a temporary `GIT_NECK_USER_DATA_DIR`, so they do not write to Robert's real practice history.
- Debug simulated input is not the primary practice flow.
- Normal microphone audio can validate pitch class, but cannot prove the physical fret or string.
- Session tuning offset is intentionally conservative: it learns slowly, ignores large observations, clamps the offset, and resets each session.
- App state schema is now version 3 to migrate old Tiger Mode defaults and add session status.
- Real state inspection on 2026-06-14 showed Tiger Mode worked: misses stayed on C/F/B/D until the target was hit. It also showed long silent gaps could previously inflate response time, which is now fixed.
- Real state inspection after Robert's progress check on 2026-06-14 showed Progress did track the ended 11:37 AM session: 7 attempts, 5 pass, 2 wrong, 934ms average response. It also showed empty sessions could clutter Progress; empty-session saving is now fixed.
- Real state inspection after Robert reported false misses on 2026-06-14 showed many wrong notes were scored in about 159-260ms, often as D#/Eb. These were treated as false negatives from attack/transient detection, not user misses.

## What Is Partial

- Microphone pitch detection is intentionally simple monophonic autocorrelation.
- Microphone pitch detection is still intentionally simple and monophonic, but now uses a more conservative YIN-style pitch-period estimate.
- Audio validates heard pitch, not physical fret/string.
- Test/pressure mode exists as a simple mode with a faster scoring target; it is not a full exam flow.
- Level unlock is basic and includes force unlock warning.
- Focus-group advancement is deliberately simple: a group advances when every note in it has at least one attempt and a score of 55+.
- Training methodology is researched and the first pure `training` domain module now feeds Daily Workout selection.
- Speed and retention are currently represented as diagnosis states over pitch/string skills, not as separate standalone skill IDs.
- Fretboard visual is useful but intentionally plain.
- Backend/cloud product analytics are deferred. Current usage analytics are local-only session records; adding a tracker backend would require an explicit locked-decision change.

## What Is Broken

- No known broken core loop behavior in automated checks.

## What Is Unverified

- Real guitar accuracy through Robert's actual input setup.
- macOS microphone permission behavior on Robert's machine.
- A complete ended 15-minute session with actual guitar has not been completed yet.
- Whether the conservative tuning tolerance and stable-note gate need adjustment after Robert retests with guitar.
- Whether idle-silence forgiveness feels right in Robert's room after another real pass.
- Whether guided-string prompts feel useful without true string detection.

## Next Recommended Action

Next product step should let Robert retest a real mic practice run and verify whether false misses are reduced after the stable-note gate and YIN-style estimator.
