import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  classifyFrequencyForTarget,
  excludeIdleSilenceFromTimer,
  estimatePitchFromTimeDomain,
  IDLE_SILENCE_GRACE_MS,
  updateSessionTuningOffset,
  type PitchDetection
} from "../domain/audio";
import { FORCE_UNLOCK_WARNING, getCurrentLevel } from "../domain/curriculum";
import { renderPrompt } from "../domain/drills";
import { generateFretboard } from "../domain/fretboard";
import {
  averageResponseMs,
  getSlowestPitchClasses,
  getStrongestPitchClasses,
  getWeakestPitchClasses,
  updateMastery
} from "../domain/mastery";
import { getCoachingFeedback } from "../domain/coaching";
import { getDisplayName, PITCH_CLASSES } from "../domain/notes";
import { scoreAttempt } from "../domain/scoring";
import {
  appendAttemptToActiveSession,
  completeActiveSession,
  createCompletedPracticeSession,
  getCurrentSegment,
  getSessionSegmentRemainingMs,
  getSessionStructureConfig,
  getSessionTargetMs,
  getSessionTrends,
  recoverInterruptedSessions,
  SESSION_STRUCTURES
} from "../domain/sessions";
import type { AppState, Attempt, AttemptSource, DrillMode, DrillPrompt, Settings } from "../domain/types";
import { selectNextPrompt, getNextWorkoutFocus } from "../domain/workout";
import { createDefaultAppState, normalizeAppState } from "../persistence/schema";

type Area = "practice" | "progress" | "settings";

const STORAGE_KEY = "git-neck-state";

export function App(): ReactElement {
  const [area, setArea] = useState<Area>("practice");
  const [appState, setAppState] = useState<AppState>(() => createDefaultAppState());
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<DrillMode>("daily");
  const [prompt, setPrompt] = useState<DrillPrompt>(() =>
    selectNextPrompt({
      mastery: createDefaultAppState().mastery,
      currentLevel: 1,
      nowMs: Date.now(),
      mode: "daily"
    })
  );
  const [debugPitchClass, setDebugPitchClass] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("Mic starts automatically. Play the note.");
  const [showFretboard, setShowFretboard] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [missLockedPrompt, setMissLockedPrompt] = useState<DrillPrompt | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [statePath, setStatePath] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [audioStatus, setAudioStatus] = useState("Microphone idle.");
  const [detectedPitch, setDetectedPitch] = useState<PitchDetection | null>(null);
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState(() => Date.now());
  const [sessionPausedMs, setSessionPausedMs] = useState(0);
  const [sessionPauseStartedAtMs, setSessionPauseStartedAtMs] = useState<number | null>(null);
  const [sessionActiveMs, setSessionActiveMs] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionAttemptIds, setSessionAttemptIds] = useState<string[]>([]);
  const [sessionTuningOffsetCents, setSessionTuningOffsetCents] = useState(0);
  const [sessionTuningSamples, setSessionTuningSamples] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const scoringStartedAtMsRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<void> {
      const state = await loadPersistedState();
      if (cancelled) {
        return;
      }

      const recoveredState: AppState = {
        ...state,
        sessions: recoverInterruptedSessions(state.sessions, Date.now())
      };

      setAppState(recoveredState);
      setShowFretboard(state.settings.revealFretboardDefault);
      setPrompt(
        selectNextPrompt({
          mastery: recoveredState.mastery,
          currentLevel: recoveredState.currentLevel,
          nowMs: Date.now(),
          mode: "daily"
        })
      );
      setLoaded(true);

      if (window.gitNeckStore) {
        setStatePath(await window.gitNeckStore.getStatePath());
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    void savePersistedState(appState);
  }, [appState, loaded]);

  useEffect(() => {
    if (paused || lastAttempt) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedMs(Date.now() - prompt.createdAtMs);
    }, 100);

    return () => clearInterval(timer);
  }, [lastAttempt, paused, prompt.createdAtMs]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = setInterval(() => {
      setSessionActiveMs(Date.now() - sessionStartedAtMs - sessionPausedMs);
    }, 500);

    return () => clearInterval(timer);
  }, [paused, sessionPausedMs, sessionStartedAtMs]);

  const stopListening = useCallback((nextStatus = "Microphone idle.") => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setAudioStatus(nextStatus);
  }, []);

  const nextPrompt = useCallback(() => {
    stopListening();
    if (sessionPauseStartedAtMs !== null) {
      setSessionPausedMs((value) => value + Date.now() - sessionPauseStartedAtMs);
      setSessionPauseStartedAtMs(null);
    }

    if (appState.settings.tigerMode && missLockedPrompt) {
      setPrompt({ ...missLockedPrompt, id: `prompt-${Date.now()}`, createdAtMs: Date.now() });
      setDebugPitchClass(null);
      setDetectedPitch(null);
      setLastAttempt(null);
      setElapsedMs(0);
      setFeedback("Tiger Mode: same note until you hit it.");
      setShowFretboard(appState.settings.revealFretboardDefault);
      setPaused(false);
      return;
    }

    const next = selectNextPrompt({
      mastery: appState.mastery,
      currentLevel: appState.currentLevel,
      nowMs: Date.now(),
      mode
    });

    setPrompt(next);
    setDebugPitchClass(null);
    setDetectedPitch(null);
    setLastAttempt(null);
    setElapsedMs(0);
    setFeedback("Mic starts automatically. Play the note.");
    setShowFretboard(appState.settings.revealFretboardDefault);
    setPaused(false);
  }, [
    appState.currentLevel,
    appState.mastery,
    appState.settings.revealFretboardDefault,
    appState.settings.tigerMode,
    missLockedPrompt,
    mode,
    sessionPauseStartedAtMs,
    stopListening
  ]);

  const repeatPrompt = useCallback(() => {
    stopListening();
    if (sessionPauseStartedAtMs !== null) {
      setSessionPausedMs((value) => value + Date.now() - sessionPauseStartedAtMs);
      setSessionPauseStartedAtMs(null);
    }
    setPrompt({ ...prompt, id: `prompt-${Date.now()}`, createdAtMs: Date.now() });
    setDebugPitchClass(null);
    setDetectedPitch(null);
    setLastAttempt(null);
    setElapsedMs(0);
    setFeedback("Same prompt.");
    setShowFretboard(appState.settings.revealFretboardDefault);
    setPaused(false);
  }, [appState.settings.revealFretboardDefault, prompt, sessionPauseStartedAtMs, stopListening]);

  const scoreDetectedPitch = useCallback((pitchClass: number, source: AttemptSource) => {
    const nowMs = Date.now();
    const outcome = scoreAttempt({
      prompt,
      mode,
      submittedPitchClass: pitchClass,
      submittedDisplayName: getDisplayName(pitchClass),
      source,
      responseMs: nowMs - scoringStartedAtMsRef.current,
      previousAttempts: appState.attempts,
      nowMs
    });

    const activePracticeMs =
      nowMs - sessionStartedAtMs - sessionPausedMs - (sessionPauseStartedAtMs === null ? 0 : nowMs - sessionPauseStartedAtMs);
    const activeSessionId = currentSessionId ?? `session-${sessionStartedAtMs}`;
    const nextSessions = appendAttemptToActiveSession({
      sessions: appState.sessions,
      sessionId: activeSessionId,
      mode,
      structure: appState.settings.sessionStructure,
      startedAtMs: sessionStartedAtMs,
      activePracticeMs,
      attemptId: outcome.attempt.id
    });
    const nextState: AppState = {
      ...appState,
      attempts: [...appState.attempts, outcome.attempt],
      mastery: updateMastery(appState.mastery, outcome.attempt),
      sessions: nextSessions
    };

    setAppState(nextState);
    setCurrentSessionId(activeSessionId);
    setSessionAttemptIds((attemptIds) => [...attemptIds, outcome.attempt.id]);
    setLastAttempt(outcome.attempt);
    setMissLockedPrompt(outcome.attempt.result === "pass" ? null : prompt);
    setElapsedMs(outcome.attempt.responseMs);
    setFeedback(getCoachingFeedback(outcome.attempt, prompt));
    setShowFretboard(true);
  }, [
    appState,
    currentSessionId,
    mode,
    prompt,
    sessionPauseStartedAtMs,
    sessionPausedMs,
    sessionStartedAtMs
  ]);

  const togglePause = useCallback(() => {
    if (paused) {
      const pauseDurationMs = sessionPauseStartedAtMs === null ? 0 : Date.now() - sessionPauseStartedAtMs;
      setPrompt((currentPrompt) => ({
        ...currentPrompt,
        createdAtMs: currentPrompt.createdAtMs + pauseDurationMs
      }));
      setSessionPausedMs((value) => value + pauseDurationMs);
      setSessionPauseStartedAtMs(null);
      setPaused(false);
      setAudioStatus("Microphone idle.");
      return;
    }

    stopListening("Paused. Timer stopped.");
    setSessionPauseStartedAtMs(Date.now());
    setPaused(true);
  }, [paused, sessionPauseStartedAtMs, stopListening]);

  const endSession = useCallback(() => {
    stopListening();
    const nowMs = Date.now();
    const activePracticeMs =
      nowMs - sessionStartedAtMs - sessionPausedMs - (sessionPauseStartedAtMs === null ? 0 : nowMs - sessionPauseStartedAtMs);
    const completedSession =
      sessionAttemptIds.length > 0
        ? currentSessionId === null
          ? createCompletedPracticeSession({
              id: `session-${nowMs}`,
              mode,
              structure: appState.settings.sessionStructure,
              startedAtMs: sessionStartedAtMs,
              endedAtMs: nowMs,
              activePracticeMs,
              attemptIds: sessionAttemptIds
            })
          : null
        : null;

    if (currentSessionId !== null) {
      setAppState({
        ...appState,
        sessions: completeActiveSession({
          sessions: appState.sessions,
          sessionId: currentSessionId,
          endedAtMs: nowMs,
          activePracticeMs
        })
      });
    } else if (completedSession) {
      setAppState({
        ...appState,
        sessions: [...appState.sessions, completedSession]
      });
    }
    setSessionStartedAtMs(nowMs);
    setSessionPausedMs(0);
    setSessionPauseStartedAtMs(null);
    setSessionActiveMs(0);
    setCurrentSessionId(null);
    setSessionAttemptIds([]);
    setMissLockedPrompt(null);
    setSessionTuningOffsetCents(0);
    setSessionTuningSamples(0);
    setPaused(false);
    setFeedback(completedSession ? "Session saved. Start the next one clean." : "No attempts to save. Start clean.");
    setMicEnabled(false);
  }, [
    appState,
    currentSessionId,
    mode,
    sessionAttemptIds,
    sessionPauseStartedAtMs,
    sessionPausedMs,
    sessionStartedAtMs,
    stopListening
  ]);

  const startListening = useCallback(async () => {
    try {
      if (listening || paused || lastAttempt) {
        return;
      }

      setMicEnabled(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        setAudioStatus("Microphone input is not available in this environment.");
        setMicEnabled(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      const audioContext = new AudioCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      scoringStartedAtMsRef.current = Date.now();
      setPrompt((currentPrompt) => ({ ...currentPrompt, createdAtMs: scoringStartedAtMsRef.current }));
      setListening(true);
      setAudioStatus("Listening. Play one clear note.");

      const buffer = new Float32Array(analyser.fftSize);
      let stablePitchClass: number | null = null;
      let stableFrames = 0;
      let silenceStartedAtMs: number | null = scoringStartedAtMsRef.current;
      let idleStatusShown = false;

      const tick = (): void => {
        analyser.getFloatTimeDomainData(buffer);
        const detection = estimatePitchFromTimeDomain(buffer, audioContext.sampleRate);

        if (detection) {
          if (silenceStartedAtMs !== null) {
            const idleAdjustment = excludeIdleSilenceFromTimer({
              scoringStartedAtMs: scoringStartedAtMsRef.current,
              silenceStartedAtMs,
              resumedAtMs: Date.now()
            });

            if (idleAdjustment.excludedIdleMs > 0) {
              scoringStartedAtMsRef.current = idleAdjustment.scoringStartedAtMs;
              setPrompt((currentPrompt) => ({
                ...currentPrompt,
                createdAtMs: currentPrompt.createdAtMs + idleAdjustment.excludedIdleMs
              }));
            }

            silenceStartedAtMs = null;
            idleStatusShown = false;
          }

          const classification = classifyFrequencyForTarget({
            frequencyHz: detection.frequencyHz,
            targetPitchClass: prompt.targetPitchClass,
            tuningOffsetCents: sessionTuningOffsetCents
          });
          const calibratedDetection = {
            ...detection,
            pitchClass: classification.pitchClass,
            displayName: classification.displayName,
            cents: classification.centsFromTarget
          };

          setDetectedPitch(calibratedDetection);
          setAudioStatus(
            `Heard ${classification.displayName} (${Math.round(detection.frequencyHz)} Hz, ${formatCents(
              classification.centsFromTarget
            )}).`
          );

          if (classification.pitchClass === stablePitchClass) {
            stableFrames += 1;
          } else {
            stablePitchClass = classification.pitchClass;
            stableFrames = 1;
          }

          if (!lastAttempt && stableFrames >= 5) {
            if (classification.acceptedAsTarget) {
              const tuningUpdate = updateSessionTuningOffset({
                currentOffsetCents: sessionTuningOffsetCents,
                sampleCount: sessionTuningSamples,
                observedOffsetCents: classification.observedTuningOffsetCents
              });
              setSessionTuningOffsetCents(tuningUpdate.tuningOffsetCents);
              setSessionTuningSamples(tuningUpdate.sampleCount);
            }

            scoreDetectedPitch(classification.pitchClass, "microphone");
            stopListening(`Scored ${classification.displayName}. Listening stopped.`);
            return;
          }
        } else {
          stablePitchClass = null;
          stableFrames = 0;
          silenceStartedAtMs ??= Date.now();
          if (!idleStatusShown && Date.now() - silenceStartedAtMs > IDLE_SILENCE_GRACE_MS) {
            setAudioStatus("Idle silence. Break time will be ignored.");
            idleStatusShown = true;
          }
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (error) {
      setAudioStatus(error instanceof Error ? error.message : "Microphone permission failed.");
      setMicEnabled(false);
      setListening(false);
    }
  }, [
    lastAttempt,
    listening,
    paused,
    prompt.targetPitchClass,
    scoreDetectedPitch,
    sessionTuningOffsetCents,
    sessionTuningSamples,
    stopListening
  ]);

  useEffect(() => stopListening, [stopListening]);

  useEffect(() => {
    if (area !== "practice" || !loaded || !micEnabled || paused || lastAttempt || listening) {
      return;
    }

    void startListening();
  }, [area, lastAttempt, listening, loaded, micEnabled, paused, startListening]);

  useEffect(() => {
    if (area === "practice" || !listening) {
      return;
    }

    stopListening();
  }, [area, listening, stopListening]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (listening) {
          setMicEnabled(false);
          stopListening();
        } else {
          setMicEnabled(true);
          void startListening();
        }
      } else if (event.key.toLowerCase() === "r") {
        repeatPrompt();
      } else if (event.key.toLowerCase() === "f") {
        setShowFretboard((value) => !value);
      } else if (event.key === "Enter") {
        if (lastAttempt) {
          nextPrompt();
        } else {
          void startListening();
        }
      } else if (event.key === "Escape") {
        togglePause();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastAttempt, listening, nextPrompt, repeatPrompt, startListening, stopListening, togglePause]);

  useEffect(() => {
    if (area !== "practice" || !lastAttempt || paused) {
      return;
    }

    const timer = setTimeout(() => {
      if (lastAttempt.result === "pass") {
        nextPrompt();
      } else {
        repeatPrompt();
      }
    }, lastAttempt.result === "pass" ? 900 : 1300);

    return () => clearTimeout(timer);
  }, [area, lastAttempt, nextPrompt, paused, repeatPrompt]);

  const level = getCurrentLevel(appState.currentLevel);
  const recentAttempts = appState.attempts.slice(-8).reverse();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Git Neck</p>
          <h1>Fretboard recall trainer</h1>
        </div>
        <nav className="tabs" aria-label="Primary">
          <button className={area === "practice" ? "active" : ""} onClick={() => setArea("practice")}>
            Practice
          </button>
          <button className={area === "progress" ? "active" : ""} onClick={() => setArea("progress")}>
            Progress
          </button>
          <button className={area === "settings" ? "active" : ""} onClick={() => setArea("settings")}>
            Settings / Debug
          </button>
        </nav>
      </header>

      {area === "practice" && (
        <PracticeArea
          appState={appState}
          elapsedMs={elapsedMs}
          feedback={feedback}
          lastAttempt={lastAttempt}
          mode={mode}
          onModeChange={setMode}
          onEndSession={endSession}
          onNext={nextPrompt}
          onPauseToggle={togglePause}
          onRepeat={repeatPrompt}
          onStartListening={() => void startListening()}
          onStopListening={() => {
            setMicEnabled(false);
            stopListening();
          }}
          onToggleFretboard={() => setShowFretboard((value) => !value)}
          audioStatus={audioStatus}
          detectedPitch={detectedPitch}
          listening={listening}
          micEnabled={micEnabled}
          paused={paused}
          prompt={prompt}
          sessionActiveMs={sessionActiveMs}
          sessionAttemptCount={sessionAttemptIds.length}
          sessionTuningOffsetCents={sessionTuningOffsetCents}
          sessionTuningSamples={sessionTuningSamples}
          tigerLocked={appState.settings.tigerMode && missLockedPrompt !== null}
          showFretboard={showFretboard}
        />
      )}

      {area === "progress" && (
        <ProgressArea
          appState={appState}
          currentLevelName={level.name}
          nextWorkoutFocus={getNextWorkoutFocus(appState.mastery)}
          recentAttempts={recentAttempts}
          sessionTrends={getSessionTrends(appState)}
        />
      )}

      {area === "settings" && (
        <SettingsArea
          appState={appState}
          forceUnlockWarning={FORCE_UNLOCK_WARNING}
          onSettingsChange={(settings) => setAppState({ ...appState, settings })}
          onDebugPitchChange={setDebugPitchClass}
          onDebugSubmit={() => {
            if (debugPitchClass !== null) {
              scoreDetectedPitch(debugPitchClass, "simulated");
            }
          }}
          onSetLevel={(currentLevel) => setAppState({ ...appState, currentLevel })}
          debugPitchClass={debugPitchClass}
          recentAttempts={recentAttempts}
          statePath={statePath}
        />
      )}
    </main>
  );
}

function PracticeArea(props: {
  appState: AppState;
  audioStatus: string;
  detectedPitch: PitchDetection | null;
  elapsedMs: number;
  feedback: string;
  lastAttempt: Attempt | null;
  listening: boolean;
  micEnabled: boolean;
  mode: DrillMode;
  onModeChange: (mode: DrillMode) => void;
  onEndSession: () => void;
  onNext: () => void;
  onPauseToggle: () => void;
  onRepeat: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleFretboard: () => void;
  paused: boolean;
  prompt: DrillPrompt;
  sessionActiveMs: number;
  sessionAttemptCount: number;
  sessionTuningOffsetCents: number;
  sessionTuningSamples: number;
  showFretboard: boolean;
  tigerLocked: boolean;
}): ReactElement {
  const positions = useMemo(
    () => generateFretboard(props.appState.settings.minFret, props.appState.settings.maxFret),
    [props.appState.settings.maxFret, props.appState.settings.minFret]
  );
  const sessionConfig = getSessionStructureConfig(props.appState.settings.sessionStructure);
  const sessionTargetMs = getSessionTargetMs(props.appState.settings.sessionStructure);
  const currentSegment = getCurrentSegment(props.sessionActiveMs, props.appState.settings.sessionStructure);
  const segmentRemainingMs = getSessionSegmentRemainingMs(props.sessionActiveMs, props.appState.settings.sessionStructure);

  return (
    <section className="practice-grid">
      <div className="prompt-panel">
        <div className="mode-row">
          {(["daily", "free", "test"] as DrillMode[]).map((mode) => (
            <button
              className={props.mode === mode ? "active small" : "small"}
              key={mode}
              onClick={() => props.onModeChange(mode)}
            >
              {mode === "daily" ? "Daily Workout" : mode === "free" ? "Free Drill" : "Test"}
            </button>
          ))}
        </div>
        <div className="session-strip">
          <div>
            <p className="eyebrow">Session</p>
            <strong>{formatDuration(props.sessionActiveMs)} / {formatDuration(sessionTargetMs)}</strong>
            <span>{sessionConfig.label}</span>
          </div>
          <div>
            <p className="eyebrow">Segment</p>
            <strong>{currentSegment} / {sessionConfig.segmentCount}</strong>
            <span>{formatDuration(segmentRemainingMs)} left</span>
          </div>
          <div>
            <p className="eyebrow">Attempts</p>
            <strong>{props.sessionAttemptCount}</strong>
            <span>{props.paused ? "Paused" : "Active"}</span>
          </div>
          <div>
            <p className="eyebrow">Tuning</p>
            <strong>{formatCents(props.sessionTuningOffsetCents)}</strong>
            <span>{props.sessionTuningSamples} samples</span>
          </div>
        </div>
        <p className="timer">{props.paused ? "Paused" : `${Math.round(props.elapsedMs / 100) / 10}s`}</p>
        <h2>{renderPrompt(props.prompt)}</h2>
        <div className="actions">
          <button
            className={props.listening ? "confirmed" : "primary"}
            onClick={props.listening ? () => props.onStopListening() : props.onStartListening}
          >
            {props.listening ? "Mic on" : props.micEnabled ? "Mic starting" : "Turn mic on"}
          </button>
          <button onClick={props.onToggleFretboard}>{props.showFretboard ? "Hide fretboard" : "Reveal fretboard"}</button>
          <button onClick={props.onPauseToggle}>{props.paused ? "Resume" : "Pause"}</button>
        </div>
        <div className="listener-panel">
          <p className="eyebrow">Microphone</p>
          <strong>{props.audioStatus}</strong>
          <span>{props.detectedPitch ? `Detected: ${props.detectedPitch.displayName}` : "Detected: -"}</span>
        </div>
        <div className="actions">
          <button onClick={props.onRepeat}>Repeat</button>
          <button disabled={props.tigerLocked} onClick={props.onNext}>
            {props.tigerLocked ? "Locked" : "Next"}
          </button>
          <button onClick={props.onEndSession}>End session</button>
        </div>
      </div>

      <aside className="coach-panel">
        <p className="eyebrow">Coach</p>
        <h3>{props.feedback}</h3>
        <p>
          {props.tigerLocked
            ? "Tiger Mode is locked on this note until you get it right."
            : props.lastAttempt
              ? "Logged in the background."
              : "Mic stays on between prompts. Scoring stays out of the way."}
        </p>
        {props.showFretboard && <Fretboard positions={positions} />}
      </aside>
    </section>
  );
}

function Fretboard(props: { positions: ReturnType<typeof generateFretboard> }): ReactElement {
  const frets = Array.from(new Set(props.positions.map((position) => position.fret)));
  const strings = ["lowE", "A", "D", "G", "B", "highE"];

  return (
    <div className="fretboard">
      <div className="fret-row header-row">
        <span />
        {frets.map((fret) => (
          <span key={fret}>{fret}</span>
        ))}
      </div>
      {strings.map((stringName) => (
        <div className="fret-row" key={stringName}>
          <strong>{stringName}</strong>
          {frets.map((fret) => {
            const position = props.positions.find((item) => item.string === stringName && item.fret === fret);
            return <span key={`${stringName}-${fret}`}>{position?.displayName}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

function ProgressArea(props: {
  appState: AppState;
  currentLevelName: string;
  nextWorkoutFocus: string;
  recentAttempts: Attempt[];
  sessionTrends: ReturnType<typeof getSessionTrends>;
}): ReactElement {
  const weakest = getWeakestPitchClasses(props.appState.mastery, 4);
  const strongest = getStrongestPitchClasses(props.appState.mastery, 4);
  const slowest = getSlowestPitchClasses(props.appState.mastery, 4);

  return (
    <section className="stack">
      <div className="summary-band">
        <div>
          <p className="eyebrow">Current level</p>
          <h2>{props.appState.currentLevel}. {props.currentLevelName}</h2>
        </div>
        <div>
          <p className="eyebrow">Next workout focus</p>
          <h2>{props.nextWorkoutFocus}</h2>
        </div>
      </div>
      <div className="metric-grid">
        <MetricList title="Weakest notes" items={weakest.map((entry) => `${getDisplayName(entry.pitchClass)} · ${entry.score}`)} />
        <MetricList title="Strongest notes" items={strongest.map((entry) => `${getDisplayName(entry.pitchClass)} · ${entry.score}`)} />
        <MetricList
          title="Slowest notes"
          items={slowest.length === 0 ? ["No timed attempts yet"] : slowest.map((entry) => `${getDisplayName(entry.pitchClass)} · ${averageResponseMs(entry)}ms`)}
        />
      </div>
      <section className="metric-panel">
        <p className="eyebrow">Session trends</p>
        <div className="attempt-list">
          {props.sessionTrends.length === 0 && <p>No completed sessions yet.</p>}
          {props.sessionTrends.map((trend) => (
            <div className="attempt-row trend-row" key={trend.sessionId}>
              <span>{trend.label}</span>
              <span>{trend.status}</span>
              <span>{trend.accuracyPercent}%</span>
              <span>{trend.averageResponseMs}ms avg</span>
              <span>{formatDuration(trend.activePracticeMs)}</span>
            </div>
          ))}
        </div>
      </section>
      <RecentAttempts attempts={props.recentAttempts} />
    </section>
  );
}

function MetricList(props: { title: string; items: string[] }): ReactElement {
  return (
    <section className="metric-panel">
      <p className="eyebrow">{props.title}</p>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function RecentAttempts(props: { attempts: Attempt[] }): ReactElement {
  return (
    <section className="metric-panel">
      <p className="eyebrow">Recent attempts</p>
      <div className="attempt-list">
        {props.attempts.length === 0 && <p>No attempts yet.</p>}
        {props.attempts.map((attempt) => (
          <div className="attempt-row" key={attempt.id}>
            <span>{getDisplayName(attempt.targetPitchClass)}</span>
            <span>{attempt.submittedDisplayName ?? "-"}</span>
            <span>{attempt.result}</span>
            <span>{Math.round(attempt.responseMs)}ms</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsArea(props: {
  appState: AppState;
  debugPitchClass: number | null;
  forceUnlockWarning: string;
  onDebugPitchChange: (pitchClass: number) => void;
  onDebugSubmit: () => void;
  onSettingsChange: (settings: Settings) => void;
  onSetLevel: (level: number) => void;
  recentAttempts: Attempt[];
  statePath: string | null;
}): ReactElement {
  const { settings } = props.appState;

  return (
    <section className="settings-grid">
      <div className="metric-panel">
        <p className="eyebrow">Settings</p>
        <label>
          Workout length
          <input
            min="1"
            type="number"
            value={settings.workoutLengthMinutes}
            onChange={(event) =>
              props.onSettingsChange({ ...settings, workoutLengthMinutes: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label>
          Min fret
          <input
            min="0"
            type="number"
            value={settings.minFret}
            onChange={(event) => props.onSettingsChange({ ...settings, minFret: Number(event.currentTarget.value) })}
          />
        </label>
        <label>
          Max fret
          <input
            min="0"
            type="number"
            value={settings.maxFret}
            onChange={(event) => props.onSettingsChange({ ...settings, maxFret: Number(event.currentTarget.value) })}
          />
        </label>
        <label className="toggle">
          <input
            checked={settings.tigerMode}
            type="checkbox"
            onChange={(event) => props.onSettingsChange({ ...settings, tigerMode: event.currentTarget.checked })}
          />
          Tiger Mode
        </label>
        <label className="toggle">
          <input
            checked={settings.revealFretboardDefault}
            type="checkbox"
            onChange={(event) =>
              props.onSettingsChange({ ...settings, revealFretboardDefault: event.currentTarget.checked })
            }
          />
          Reveal fretboard by default
        </label>
        <label>
          Session structure
          <select
            value={settings.sessionStructure}
            onChange={(event) =>
              props.onSettingsChange({
                ...settings,
                sessionStructure: event.currentTarget.value as Settings["sessionStructure"]
              })
            }
          >
            {SESSION_STRUCTURES.map((structure) => (
              <option key={structure.structure} value={structure.structure}>
                {structure.label}
              </option>
            ))}
          </select>
        </label>
        <p>Active input mode: microphone</p>
        <p>{props.statePath ? `State file: ${props.statePath}` : "State file: renderer fallback"}</p>
      </div>
      <div className="metric-panel">
        <p className="eyebrow">Debug simulated input</p>
        <p>Use only when microphone testing is blocked.</p>
        <div className="note-buttons compact" aria-label="Debug simulated note input">
          {PITCH_CLASSES.map((pitchClass) => (
            <button
              className={props.debugPitchClass === pitchClass.value ? "selected-note" : ""}
              key={pitchClass.value}
              onClick={() => props.onDebugPitchChange(pitchClass.value)}
            >
              {pitchClass.displayName}
            </button>
          ))}
        </div>
        <button className="primary" onClick={props.onDebugSubmit}>
          Score debug note
        </button>
      </div>
      <div className="metric-panel">
        <p className="eyebrow">Curriculum</p>
        <p>Level {props.appState.currentLevel}</p>
        <button
          onClick={() => props.onSetLevel(Math.min(5, props.appState.currentLevel + 1))}
          disabled={props.appState.currentLevel >= 5}
        >
          Force unlock next level
        </button>
        <p>{props.forceUnlockWarning}</p>
      </div>
      <RecentAttempts attempts={props.recentAttempts} />
    </section>
  );
}

async function loadPersistedState(): Promise<AppState> {
  if (window.gitNeckStore) {
    return window.gitNeckStore.loadState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return normalizeAppState(raw ? JSON.parse(raw) : null);
}

async function savePersistedState(state: AppState): Promise<void> {
  if (window.gitNeckStore) {
    await window.gitNeckStore.saveState(state);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCents(cents: number): string {
  if (cents === 0) {
    return "0c";
  }

  return `${cents > 0 ? "+" : ""}${cents}c`;
}
