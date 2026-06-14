# DECISIONS

## Locked Decisions

- App name: Git Neck.
- v0.1 focus: fretboard note mastery only.
- Standard tuning only.
- Right-handed fretboard only.
- Default fret range: open-12.
- Enharmonic equivalents count as the same pitch class.
- Fretboard visual is toggleable.
- Default behavior hides fretboard during the attempt and reveals after an answer.
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
- Simulated input is debug-only and must not be the primary practice flow.
- Guided-string prompts verify note correctness only.
- Do not claim automatic string detection.
- Do not claim physical fret detection from normal microphone audio.
- Persistence is local-only.

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
