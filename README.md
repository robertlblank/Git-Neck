# Git Neck

Git Neck is a local macOS desktop app for fretboard note mastery. The current loop is:

```text
prompt -> app listens to guitar -> detects pitch class -> score -> feedback -> update mastery -> next prompt
```

## Current Build Includes

- Electron + React + TypeScript app shell
- Standard tuning, right-handed, open-12 fretboard model
- Note-only and guided-string note prompts
- Microphone listening through the computer
- Simple monophonic pitch-class detection
- Conservative session-relative tuning tolerance
- Deterministic scoring and canned coaching
- Continuous microphone flow during Practice
- Background scoring that stays out of the way during Practice
- Auto-advance after a scored note
- Tiger Mode default-on: misses and too-slow hits repeat the same prompt until clean
- Clean streak, slow-answer, and repeated-mistake handling
- Pause/resume so breaks do not count against response time
- Session structures: `1 x 15`, `3 x 5`, or `5 x 3`
- Completed session trends
- Basic mastery tracking and workout prompt weighting
- Local JSON persistence through Electron IPC
- Practice, Progress, and Settings / Debug areas
- Debug-only simulated note input
- Unit and Electron UI workflow tests

## Intentionally Deferred

- Polished tuner-grade pitch detection
- Calibration wizard and input-device selection
- Automatic physical string/fret detection
- Intervals, chord tones, scales, songs, backing tracks, ear training
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

1. Read the prompt.
2. Grant microphone permission if macOS asks.
3. Play one clear guitar note into this computer's input.
4. The app detects a stable pitch class, applies the current session's conservative tuning offset, and scores automatically.
5. Git Neck briefly shows coaching feedback, advances automatically after a pass, or repeats the same prompt after a miss/slow hit.
6. Use `Pause` when you stop for a text or interruption.
7. Use `Turn mic on`, `Repeat`, `Next`, or `End session` as manual overrides.

## Session Options

Use Settings / Debug to choose:

- `1 x 15 minutes`
- `3 x 5 minutes`
- `5 x 3 minutes`

Paused time does not count toward the prompt response timer or active session time.

## Keyboard Shortcuts

- `Space` = turn mic on/off
- `R` = repeat prompt
- `F` = reveal/hide fretboard
- `Enter` = next if feedback is showing, otherwise start listening
- In Tiger Mode, `Enter`/`Next` cannot skip a missed prompt.
- `Esc` = pause/resume timer and stop listening

## Known Limitations

- Pitch detection is intentionally simple and monophonic.
- Loud rooms, chords, low input gain, or sustained overtones may confuse detection.
- Normal microphone input validates pitch, not the physical fret or string.
- Guided-string prompts say where to play, but the mic cannot prove the string/fret by itself.
- Detailed score/result data is intentionally kept out of the Practice view and shown in Progress/history instead.
- Practice should not require clicking before every note; the mic restarts automatically between prompts.
- Tiger Mode is default-on; turn it off in Settings only if you intentionally want softer practice behavior.
- Session tuning offset is conservative, learned over multiple accepted notes, and reset per session.
- Simulated input exists only under Settings / Debug.
- Persistence is a single local JSON state file.
- `npm install` reported dependency audit findings from the installed third-party tree.

## Verification Status

- `npm install`: passed.
- `npm test`: passed, 33 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: passed full Electron workflow test.
