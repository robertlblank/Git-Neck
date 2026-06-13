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
- Pause/resume excludes break time from response scoring and active session time.
- Session structures support `1 x 15`, `3 x 5`, and `5 x 3`.
- Completed session trends show session accuracy, average response time, attempt count, and active duration.
- Conservative session tuning offset learns slowly from accepted target notes and resets each session.
- Progress area with current level, weakest notes, strongest notes, slowest notes, recent attempts, session trends, and next workout focus.
- Settings / Debug area with workout length, fret range, session structure, Tiger Mode, reveal default, active input mode, force unlock, state file path, recent attempts, and debug-only simulated note input.
- Pure domain modules for notes, fretboard, audio helpers, sessions, drills, scoring, coaching, mastery, curriculum, and workout.
- Local JSON persistence through Electron main/preload IPC.
- Unit tests and Electron UI workflow tests pass.
- Project folder is `/Users/robertblank/Guitar Gear Codex/git-neck`.
- Stop Listening blank-screen bug is fixed and covered by E2E regression.

## Known Facts

- The built Electron app loads the emitted preload file at `out/preload/index.mjs`.
- Local persistence is through Electron IPC to `git-neck-state.json`.
- E2E tests use a temporary `GIT_NECK_USER_DATA_DIR`, so they do not write to Robert's real practice history.
- Debug simulated input is not the primary practice flow.
- Normal microphone audio can validate pitch class, but cannot prove the physical fret or string.
- Session tuning offset is intentionally conservative: it learns slowly, ignores large observations, clamps the offset, and resets each session.

## What Is Partial

- Microphone pitch detection is intentionally simple monophonic autocorrelation.
- Audio validates heard pitch, not physical fret/string.
- Test/pressure mode exists as a simple mode with a faster scoring target; it is not a full exam flow.
- Curriculum unlock is basic and includes force unlock warning.
- Fretboard visual is useful but intentionally plain.

## What Is Broken

- No known broken core loop behavior in automated checks.

## What Is Unverified

- Real guitar accuracy through Robert's actual input setup.
- macOS microphone permission behavior on Robert's machine.
- A human 15-minute session with actual guitar has not been completed yet.
- Whether the conservative tuning tolerance needs adjustment after real playing.
- Whether guided-string prompts feel useful without true string detection.

## Next Recommended Action

Run `npm run dev`, grant microphone permission, and test real guitar notes across a complete 15-minute session.
