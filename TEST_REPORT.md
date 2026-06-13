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
Tests       31 passed (31)
```

Coverage includes notes, fretboard, audio pitch helpers, conservative tuning offset, sessions, scoring, mastery/workout, and persistence.

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
- End session creates a trend entry
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

## Current Risk

Automated checks pass. The remaining risk is real-world pitch detection quality with Robert's guitar/computer input and microphone permissions.

## Known vs Unknown

Known:

- Unit tests pass: 31 tests.
- Built Electron E2E workflow passes with fake media.
- Preload path is fixed for built Electron.
- Project has been renamed to Git Neck in package metadata, UI, docs, IPC names, storage names, and tests.
- Project folder has been renamed to `/Users/robertblank/Guitar Gear Codex/git-neck`.

Unknown:

- Actual guitar/microphone detection quality in Robert's room.
- Whether macOS prompts for microphone permission cleanly on Robert's machine.
- Whether the conservative tuning offset feels too strict or too forgiving in a real 15-minute session.
