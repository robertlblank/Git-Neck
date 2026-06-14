# TEST_REPORT

## Commands Run

```bash
npm install
```

Result: passed. Installed dependencies and created `package-lock.json`. npm reported 7 high severity audit findings in third-party dependencies. Forced audit fixes were not run because they can introduce breaking dependency churn.

```bash
npm test
```

Result: passed.

```text
Test Files  7 passed (7)
Tests       35 passed (35)
```

Coverage includes notes, fretboard, audio pitch helpers, idle-silence timing exclusion, conservative tuning offset, sessions, scoring, mastery/workout, persistence, and Tiger Mode default migration.

```bash
npm run typecheck
npm run lint
npm run build
```

Result: passed.

```bash
npm run test:e2e
```

Result: passed full Electron UI/UX workflow test.

Covered:

- app shell loads
- listen-first Practice UX
- mode controls
- pause/resume session control
- fretboard reveal/hide
- keyboard shortcuts
- microphone start invocation with fake media
- Settings / Debug simulated scoring fallback
- Tiger Mode lock/unlock regression: intentional debug miss returns to Practice as `Locked`; correct retry clears back to `Next`
- End session creates a trend entry and an immediate empty End session does not add a zero-attempt trend
- Progress recent attempts
- settings persistence across Electron relaunch

The E2E test uses a temporary `GIT_NECK_USER_DATA_DIR` so it does not pollute Robert's real practice history.

## Post-Rename Verification

After renaming the project folder from `get-neck` to `git-neck`, these commands were rerun from:

```text
/Users/robertblank/Guitar Gear Codex/git-neck
```

```bash
npm test
npm run test:e2e
```

Result: both passed.

## Bugs Found And Fixed

- Built Electron preload path pointed at `out/preload/index.js`, but electron-vite emits `out/preload/index.mjs`; fixed.
- Built Electron then exposed that sandboxed preload rejected ESM `.mjs`; fixed by emitting CommonJS preload `out/preload/index.cjs`.
- E2E initially used a flaky debug input locator; fixed with a direct ARIA locator.
- E2E initially left Electron processes alive on failures; hardened cleanup and live step logging.
- JavaScript `-0` cents display was normalized to `0c`.
- Stop Listening blanked the renderer because the click event object was passed into `stopListening(nextStatus)` and rendered as audio status; fixed by wrapping the click handler.
- Added an E2E regression that clicks Start/Stop listening and asserts the app remains rendered.
- Practice score/result widgets were removed from the active playing view; E2E asserts Practice does not show `Current streak` or the result panel.
- Background auto-advance was added so correct answers move on and wrong/slow answers repeat without requiring a click.
- Continuous microphone flow was added so Practice starts/restarts listening between prompts without per-note click-through; E2E asserts this behavior.
- Tiger Mode was made default-on and real: wrong/slow answers lock the prompt until a pass, the Practice `Next` control becomes `Locked`, old v1 persisted defaults migrate to strict repeat, and E2E now verifies lock/unlock behavior.
- Idle-silence forgiveness was added so quiet breaks over 5 seconds are excluded from response timing instead of creating slow attempts.
- Empty sessions are no longer saved to Progress when `End session` is clicked without any attempts.

## Real State Inspection On 2026-06-14

Read from:

```text
/Users/robertblank/Library/Application Support/git-neck/git-neck-state.json
```

Known from Robert's real mic/guitar run:

- App state version: 2.
- Tiger Mode: on.
- Total persisted attempts: 94.
- Latest 20 attempts: 10 pass, 8 wrong_note, 2 too_slow.
- Strict repeat worked: wrong/slow prompts stayed on the same target until a pass in observed sequences for C, F, B, and D.
- Two recent correct notes were marked `too_slow`: B at 4001ms and D at 3502ms.
- One wrong F attempt had a 19723ms response time, showing that long quiet gaps could previously inflate timing.
- Today's attempts updated mastery/recent attempts, but no completed session trend was created because the current run was not ended with `End session`.

Action taken:

- Added idle-silence timing exclusion so quiet gaps over 5 seconds are ignored by response timing.

## Real State Inspection After Progress Check On 2026-06-14

Known from Robert's follow-up run:

- Total persisted attempts increased to 109.
- Total persisted sessions increased to 5.
- The 11:37 AM session did track in Progress: 7 attempts, 5 pass, 2 wrong_note, average response 934ms, active time 42.8s.
- The 5-second idle test worked: the latest idle-after-quiet attempts were saved as passes, not `too_slow`.
- A second empty 3.3s session was saved after the real session, which made Progress harder to read.

Action taken:

- `End session` now saves a completed session only when there is at least one attempt.
- E2E now verifies that a real session creates a trend and an immediate empty session does not increase persisted session count.

## Latest Verification After Idle Timing Fix

Run from:

```text
/Users/robertblank/Guitar Gear Codex/git-neck
```

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

Result:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 7 files / 35 tests.
- `npm run build`: passed.
- `npm run test:e2e`: passed full Electron workflow test.
- `npm run dev`: built and launched the Electron dev app. Renderer used `http://localhost:5174/` because `5173` was already occupied. Dev processes were stopped after verification.

## Current Risk

Automated checks pass. The remaining risk is real-world pitch detection quality with Robert's guitar/computer input and microphone permissions.

## Known vs Unknown

Known:

- Unit tests pass: 35 tests.
- Built Electron E2E workflow passes with fake media.
- Preload path is fixed for built Electron.
- Project has been renamed to Git Neck in package metadata, UI, docs, IPC names, storage names, and tests.
- Project folder has been renamed to `/Users/robertblank/Guitar Gear Codex/git-neck`.

Unknown:

- Exact long-session guitar/microphone detection quality in Robert's room.
- Whether the conservative tuning offset feels too strict or too forgiving in a real 15-minute session.
- Whether idle-silence forgiveness feels right during a real interruption.
