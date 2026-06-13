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
- Pause/resume excludes break time from response scoring and active session time.
- Practice can be structured as 1 x 15, 3 x 5, or 5 x 3.
- Completed session trends are shown in Progress.
- Simulated input exists only in Settings / Debug.
- Verbal confirmation and talking to the app are no longer part of the product.
- Tests currently pass: 31 unit tests plus the Electron E2E workflow.
- Post-rename verification from `/Users/robertblank/Guitar Gear Codex/git-neck` passed for `npm test` and `npm run test:e2e`.

What not to touch:
- Do not reintroduce verbal confirmation.
- Do not make simulated input the primary flow again.
- Do not add LLM coaching, speech, songs, scales, backing tracks, cloud, accounts, packaging, signing, or notarization.
- Do not claim guided-string prompts detect the actual played string.
- Do not claim normal microphone audio can prove the physical fret/string.
- Keep tuning tolerance conservative; do not add a big calibration workflow unless Robert asks.

Exact next task:
Do a real microphone verification pass:
1. Run npm run dev.
2. Grant microphone permission if prompted.
3. Start Practice.
4. Click Start listening or press Space.
5. Play a single clear guitar note into this computer.
6. Verify the detected note appears.
7. Verify correct/wrong/slow scoring works automatically.
8. Test Pause/Resume and confirm paused time does not count.
9. End a session and verify Progress shows a trend entry.
10. Change a setting, restart, and verify persistence.
11. Update TEST_REPORT.md with the result.

If detection is unstable, tune src/domain/audio.ts conservatively and keep the interface simple.
```
