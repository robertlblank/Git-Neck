# NEXT_SESSION

Paste this into the next Codex session:

```text
You are continuing Git Neck in:

/Users/robertblank/Guitar Gear Codex/git-neck

If context was compacted or token history was lost, trust the local files over chat memory. Read the files below before acting.

Before acting, classify the request as:
On-plan / Adjacent / Scope creep / Architecture risk / Contradicts locked decision.

Read:
- README.md
- PROJECT_STATE.md
- DECISIONS.md
- TEST_REPORT.md
- src/domain/audio.ts
- src/domain/sessions.ts
- src/domain/scoring.ts
- src/renderer/App.tsx
- scripts/e2e-workflows.mjs

Run:
- npm test
- npm run typecheck
- npm run lint
- npm run build
- npm run test:e2e
- npm run dev

What is working:
- The app is audio-first and branded Git Neck.
- Practice uses Start listening as the primary action.
- The app requests microphone input, estimates one monophonic pitch, applies conservative session-relative tuning tolerance, scores automatically, updates mastery, and shows feedback.
- Practice hides detailed scoring widgets; scoring happens in the background and trends live in Progress.
- Correct answers auto-advance; wrong/slow answers repeat the prompt.
- Tiger Mode is default-on and locks missed/too-slow prompts until a clean pass; old v1 local state migrates to this default.
- The microphone starts/restarts automatically between prompts; per-note clicking is not part of the intended flow.
- Pause/resume excludes break time from response scoring and active session time.
- Idle silence over 5 seconds is excluded from response timing so quiet interruptions do not become slow attempts.
- Practice can be structured as 1 x 15, 3 x 5, or 5 x 3.
- Completed session trends are shown in Progress.
- Sessions are persisted while active, marked completed on `End session`, and recovered as interrupted if the app stops mid-session.
- Empty sessions are not saved, so Progress should only show sessions with attempts.
- Ending a session now stops practice and shows a Session Complete summary with attempts, accuracy, average response, duration, misses, slow answers, next focus, and choices for `Start another session`, `Review progress`, and `Change session type`.
- Simulated input exists only in Settings / Debug.
- Verbal confirmation and talking to the app are no longer part of the product.
- Tests currently pass: 39 unit tests plus the Electron E2E workflow.
- Latest verification from `/Users/robertblank/Guitar Gear Codex/git-neck` passed for `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run dev`.
- Robert's 2026-06-14 real state showed notes were detected, Tiger Mode blocked progress on wrong notes, and right notes progressed. It also showed old timing could count long silence; that was fixed with idle-silence exclusion.
- Robert's follow-up progress check showed the 11:37 AM session did track: 7 attempts, 5 pass, 2 wrong, 934ms average response. Empty-session clutter was found and fixed.
- Robert's UI note: after `End session`, Git Neck should not automatically feel like it starts another session. Implemented as a Session Complete state with explicit choices.
- Robert's UI note: right/wrong feedback should appear close to the displayed target note, not only in the side coach panel, so his eyes do not have to jump while practicing. This is deferred and needs product questions before implementation.

What not to touch:
- Do not reintroduce verbal confirmation.
- Do not make simulated input the primary flow again.
- Do not add LLM coaching, speech, songs, scales, backing tracks, cloud, accounts, packaging, signing, or notarization.
- Do not claim guided-string prompts detect the actual played string.
- Do not claim normal microphone audio can prove the physical fret/string.
- Keep tuning tolerance conservative; do not add a big calibration workflow unless Robert asks.
- Do not reintroduce per-note click-through.
- Do not let wrong/slow answers silently advance in default practice.
- Do not count long quiet interruptions as slow attempts.
- Do not add backend/cloud analytics unless Robert explicitly changes the local-only decision. Usage tracking is currently local-first.

Exact next task:
Ask Robert prompt-feedback placement questions before implementing:
1. Should the target note itself change color on result, or should a compact `Correct` / `Missed` badge appear beside it?
2. Should the detected note appear next to the target note, e.g. `Target: E | Heard: A`?
3. Should wrong feedback stay visible until the corrected retry, or fade quickly?
4. Should side coach remain for extra text while the immediate result moves next to the prompt?

Then continue into training-methodology/content depth:
1. Decide when to use note-only prompts vs guided-string prompts.
2. Add a simple level-specific prompt mix that teaches the neck deliberately instead of calling random notes forever.
3. Keep the loop hands-free and Tiger Mode strict by default.

If detection is unstable, tune src/domain/audio.ts conservatively and keep the interface simple.
```
