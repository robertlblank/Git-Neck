# DECISIONS

## Locked Decisions

- App name: Git Neck.
- v0.1 focus: fretboard note mastery only.
- Standard tuning only.
- Right-handed fretboard only.
- Default fret range: open-12.
- Enharmonic equivalents count as the same pitch class.
- Active Practice must not show fretboard answer locations, fret numbers, or note-position maps while drilling.
- String-specific prompts should use a stable visual cue, such as string lanes, rather than a fretboard answer reveal.
- Coaching is deterministic canned text only.
- No LLM in v0.1.
- Tone is concise sports-coach feedback, not abusive.
- The user does not talk to the app.
- No verbal confirmation gate.
- Primary input is microphone listening from this computer.
- The app scores automatically after detecting a stable pitch class.
- Tiger Mode is default-on: wrong notes and too-slow correct notes repeat the same prompt until a clean pass.
- Idle silence longer than 5 seconds is treated as break time and excluded from response timing.
- Slight tuning drift is handled by a conservative session-relative offset learned over multiple accepted notes.
- Paused time does not count against response time or active session time.
- Practice can be structured as `1 x 15`, `3 x 5`, or `5 x 3`.
- Opening the app must not start the timer or microphone. The user explicitly starts practice from the ready state.
- Ending a session should stop practice and show a deliberate Session Complete state; a new session starts only from an explicit user choice.
- Correct/miss/slow feedback should appear near the displayed prompt as a compact badge; the side coach is for secondary text.
- Daily Workout should teach small focus groups before broad recall; Free/Test can stay broader within the current level.
- Daily Workout curriculum prompts should always be string-specific; do not mix in `Any string` prompts.
- Training changes should be built through pure diagnosis/prescription modules before changing prompt behavior.
- Simulated input is debug-only and must not be the primary practice flow.
- Guided-string prompts verify note correctness only.
- Do not claim automatic string detection.
- Do not claim physical fret detection from normal microphone audio.
- Persistence is local-only.
- Product usage tracking is local-first: sessions are stored as active, completed, or interrupted in the local JSON state. Do not add cloud/backend telemetry unless Robert explicitly changes the local-only plan.

## Non-Goals

- Polished tuner-grade pitch detection in this pass.
- Calibration wizard.
- Exact automatic string/fret detection.
- Intervals, chord tones, scales, songs, backing tracks, ear training.
- Speech recognition.
- LLM coaching.
- Spoken coach.
- Pedalboard/tone support.
- Advanced analytics.
- Packaging, signing, notarization.
- SaaS, accounts, backend, cloud, mobile, or web deployment.

## Scope Guardrail

Classify new requests before acting:

```text
On-plan
Adjacent
Scope creep
Architecture risk
Contradicts locked decision
```

Do not implement a request that contradicts a locked decision unless Robert explicitly approves the change.
