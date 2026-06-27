import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  classifyFrequencyForTarget,
  excludeIdleSilenceFromTimer,
  estimatePitchFromTimeDomain,
  IDLE_SILENCE_GRACE_MS,
  shouldScoreStablePitch,
  updateSessionTuningOffset,
  type PitchDetection
} from "../domain/audio";
import { FORCE_UNLOCK_WARNING, getCurrentLevel } from "../domain/curriculum";
import { formatStringName } from "../domain/drills";
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
import type { AppState, Attempt, AttemptAudioDiagnostic, AttemptSource, DrillMode, DrillPrompt, Settings } from "../domain/types";
import { getNextWorkoutFocus, getNextWorkoutRationale, getWorkoutPlan, selectNextPrompt } from "../domain/workout";
import { createDefaultAppState, normalizeAppState } from "../persistence/schema";

type Area = "practice" | "progress" | "settings";

const STORAGE_KEY = "git-neck-state";

type PostSessionSummary = {
  sessionId: string;
  attemptCount: number;
  accuracyPercent: number;
  averageResponseMs: number;
  activePracticeMs: number;
  resultCounts: {
    pass: number;
    wrong_note: number;
    too_slow: number;
  };
  weakestNotes: string[];
};

type PromptResult = {
  tone: "correct" | "miss" | "slow" | "locked";
  label: string;
  detail: string;
};

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
  const [postSessionSummary, setPostSessionSummary] = useState<PostSessionSummary | null>(null);
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
  const listeningGenerationRef = useRef(0);
  const scoringStartedAtMsRef = useRef(Date.now());
  const appStateRef = useRef(appState);
  const currentSessionIdRef = useRef(currentSessionId);
  const sessionAttemptIdsRef = useRef(sessionAttemptIds);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    sessionAttemptIdsRef.current = sessionAttemptIds;
  }, [sessionAttemptIds]);

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

      appStateRef.current = recoveredState;
      setAppState(recoveredState);
      setShowFretboard(state.settings.revealFretboardDefault);
      setPrompt(
        selectNextPrompt({
          mastery: recoveredState.mastery,
          currentLevel: recoveredState.currentLevel,
          nowMs: Date.now(),
          mode: "daily",
          attempts: recoveredState.attempts
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
    listeningGenerationRef.current += 1;
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
    setDetectedPitch(null);
    setAudioStatus(nextStatus);
  }, []);

  const startNewSession = useCallback(() => {
    const nowMs = Date.now();
    setPostSessionSummary(null);
    setSessionStartedAtMs(nowMs);
    setSessionPausedMs(0);
    setSessionPauseStartedAtMs(null);
    setSessionActiveMs(0);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setSessionAttemptIds([]);
    sessionAttemptIdsRef.current = [];
    setMissLockedPrompt(null);
    setSessionTuningOffsetCents(0);
    setSessionTuningSamples(0);
    setLastAttempt(null);
    setDetectedPitch(null);
    setElapsedMs(0);
    setPaused(false);
    setFeedback("Mic starts automatically. Play the note.");
    setMicEnabled(true);
    setPrompt(
      selectNextPrompt({
        mastery: appState.mastery,
        currentLevel: appState.currentLevel,
        nowMs,
        mode,
        attempts: appState.attempts
      })
    );
  }, [appState.attempts, appState.currentLevel, appState.mastery, mode]);

  const nextPrompt = useCallback(() => {
    if (postSessionSummary) {
      return;
    }

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
      mode,
      attempts: appState.attempts
    });

    setPrompt(next);
    setDebugPitchClass(null);
    setDetectedPitch(null);
    setLastAttempt(null);
    setElapsedMs(0);
    setFeedback("Mic starts automatically. Play the note.");
    setShowFretboard(appState.settings.revealFretboardDefault);
    setPaused(false);
    setPostSessionSummary(null);
  }, [
    appState.currentLevel,
    appState.attempts,
    appState.mastery,
    appState.settings.revealFretboardDefault,
    appState.settings.tigerMode,
    missLockedPrompt,
    mode,
    postSessionSummary,
    sessionPauseStartedAtMs,
    stopListening
  ]);

  const repeatPrompt = useCallback(() => {
    if (postSessionSummary) {
      return;
    }

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
  }, [appState.settings.revealFretboardDefault, postSessionSummary, prompt, sessionPauseStartedAtMs, stopListening]);

  const scoreDetectedPitch = useCallback((pitchClass: number, source: AttemptSource, audioDiagnostic?: AttemptAudioDiagnostic) => {
    if (postSessionSummary) {
      return;
    }

    const nowMs = Date.now();
    const latestState = appStateRef.current;
    const latestSessionId = currentSessionIdRef.current;
    const latestAttemptIds = sessionAttemptIdsRef.current;
    const outcome = scoreAttempt({
      prompt,
      mode,
      submittedPitchClass: pitchClass,
      submittedDisplayName: getDisplayName(pitchClass),
      source,
      responseMs: nowMs - scoringStartedAtMsRef.current,
      previousAttempts: latestState.attempts,
      audioDiagnostic,
      nowMs
    });

    const activePracticeMs =
      nowMs - sessionStartedAtMs - sessionPausedMs - (sessionPauseStartedAtMs === null ? 0 : nowMs - sessionPauseStartedAtMs);
    const activeSessionId = latestSessionId ?? `session-${sessionStartedAtMs}`;
    const nextSessions = appendAttemptToActiveSession({
      sessions: latestState.sessions,
      sessionId: activeSessionId,
      mode,
      structure: latestState.settings.sessionStructure,
      startedAtMs: sessionStartedAtMs,
      activePracticeMs,
      attemptId: outcome.attempt.id
    });
    const nextState: AppState = {
      ...latestState,
      attempts: [...latestState.attempts, outcome.attempt],
      mastery: updateMastery(latestState.mastery, outcome.attempt),
      sessions: nextSessions
    };
    const nextAttemptIds = latestAttemptIds.includes(outcome.attempt.id)
      ? latestAttemptIds
      : [...latestAttemptIds, outcome.attempt.id];

    appStateRef.current = nextState;
    currentSessionIdRef.current = activeSessionId;
    sessionAttemptIdsRef.current = nextAttemptIds;
    setAppState(nextState);
    setCurrentSessionId(activeSessionId);
    setSessionAttemptIds(nextAttemptIds);
    setLastAttempt(outcome.attempt);
    setMissLockedPrompt(outcome.attempt.result === "pass" ? null : prompt);
    setElapsedMs(outcome.attempt.responseMs);
    setFeedback(getCoachingFeedback(outcome.attempt, prompt));
    setShowFretboard(true);
  }, [
    mode,
    prompt,
    sessionPauseStartedAtMs,
    sessionPausedMs,
    sessionStartedAtMs,
    postSessionSummary
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
    const latestState = appStateRef.current;
    const latestSessionId = currentSessionIdRef.current;
    const latestAttemptIds = sessionAttemptIdsRef.current;
    const activePracticeMs =
      nowMs - sessionStartedAtMs - sessionPausedMs - (sessionPauseStartedAtMs === null ? 0 : nowMs - sessionPauseStartedAtMs);
    const activeSession =
      (latestSessionId === null ? null : latestState.sessions.find((session) => session.id === latestSessionId)) ??
      [...latestState.sessions].reverse().find((session) => session.status === "active" && session.attemptIds.length > 0) ??
      null;
    const activeSessionId = activeSession?.id ?? latestSessionId;
    const endedAttemptIds = latestAttemptIds.length > 0 ? latestAttemptIds : (activeSession?.attemptIds ?? []);
    const hasAttempts = endedAttemptIds.length > 0;
    const completedSession =
      hasAttempts
        ? activeSessionId === null
          ? createCompletedPracticeSession({
              id: `session-${nowMs}`,
              mode,
              structure: latestState.settings.sessionStructure,
              startedAtMs: sessionStartedAtMs,
              endedAtMs: nowMs,
              activePracticeMs,
              attemptIds: endedAttemptIds
            })
          : null
        : null;

    const endedSessionId = activeSessionId ?? (completedSession?.id ?? `session-${nowMs}`);
    let nextState = latestState;

    if (activeSessionId !== null) {
      nextState = {
        ...latestState,
        sessions: completeActiveSession({
          sessions: latestState.sessions,
          sessionId: activeSessionId,
          endedAtMs: nowMs,
          activePracticeMs
        })
      };
    } else if (completedSession) {
      nextState = {
        ...latestState,
        sessions: [...latestState.sessions, completedSession]
      };
    }

    if (nextState !== latestState) {
      appStateRef.current = nextState;
      setAppState(nextState);
    }

    setPostSessionSummary(
      hasAttempts
        ? buildPostSessionSummary({
            sessionId: endedSessionId,
            attemptIds: endedAttemptIds,
            attempts: nextState.attempts,
            activePracticeMs
          })
        : null
    );
    setSessionStartedAtMs(nowMs);
    setSessionPausedMs(0);
    setSessionPauseStartedAtMs(null);
    setSessionActiveMs(0);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setSessionAttemptIds([]);
    sessionAttemptIdsRef.current = [];
    setMissLockedPrompt(null);
    setSessionTuningOffsetCents(0);
    setSessionTuningSamples(0);
    setPaused(false);
    setFeedback(hasAttempts ? "Session saved." : "No attempts to save. Start clean.");
    setMicEnabled(false);
  }, [
    mode,
    sessionPauseStartedAtMs,
    sessionPausedMs,
    sessionStartedAtMs,
    stopListening
  ]);

  const startListening = useCallback(async () => {
    try {
      if (listening || paused || lastAttempt || postSessionSummary) {
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

      listeningGenerationRef.current += 1;
      const listeningGeneration = listeningGenerationRef.current;
      const buffer = new Float32Array(analyser.fftSize);
      let stablePitchClass: number | null = null;
      let stablePitchStartedAtMs: number | null = null;
      let stableFrames = 0;
      let silenceStartedAtMs: number | null = scoringStartedAtMsRef.current;
      let idleStatusShown = false;

      const tick = (): void => {
        if (listeningGeneration !== listeningGenerationRef.current) {
          return;
        }

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

          const nowMs = Date.now();

          if (classification.pitchClass === stablePitchClass) {
            stableFrames += 1;
          } else {
            stablePitchClass = classification.pitchClass;
            stablePitchStartedAtMs = nowMs;
            stableFrames = 1;
          }

          if (
            !lastAttempt &&
            shouldScoreStablePitch({
              stableFrames,
              stablePitchStartedAtMs,
              nowMs
            })
          ) {
            if (classification.acceptedAsTarget) {
              const tuningUpdate = updateSessionTuningOffset({
                currentOffsetCents: sessionTuningOffsetCents,
                sampleCount: sessionTuningSamples,
                observedOffsetCents: classification.observedTuningOffsetCents
              });
              setSessionTuningOffsetCents(tuningUpdate.tuningOffsetCents);
              setSessionTuningSamples(tuningUpdate.sampleCount);
            }

            scoreDetectedPitch(classification.pitchClass, "microphone", {
              frequencyHz: Math.round(detection.frequencyHz * 10) / 10,
              centsFromTarget: classification.centsFromTarget,
              acceptedAsTarget: classification.acceptedAsTarget,
              stableMs: stablePitchStartedAtMs === null ? 0 : nowMs - stablePitchStartedAtMs,
              stableFrames,
              tuningOffsetCents: sessionTuningOffsetCents
            });
            stopListening(`Scored ${classification.displayName}. Listening stopped.`);
            return;
          }
        } else {
          stablePitchClass = null;
          stablePitchStartedAtMs = null;
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
    postSessionSummary,
    prompt.targetPitchClass,
    scoreDetectedPitch,
    sessionTuningOffsetCents,
    sessionTuningSamples,
    stopListening
  ]);

  useEffect(() => stopListening, [stopListening]);

  useEffect(() => {
    if (area !== "practice" || !loaded || !micEnabled || paused || lastAttempt || listening || postSessionSummary) {
      return;
    }

    void startListening();
  }, [area, lastAttempt, listening, loaded, micEnabled, paused, postSessionSummary, startListening]);

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
  const workoutPlan = getWorkoutPlan(appState.mastery, appState.currentLevel);
  const activeFocusSet = workoutPlan.activePitchClasses.map((pitchClass) => getDisplayName(pitchClass)).join(", ");
  const nextWorkoutRationale = getNextWorkoutRationale({
    attempts: appState.attempts,
    currentLevel: appState.currentLevel,
    mastery: appState.mastery,
    nowMs: Date.now()
  });

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
          activeFocusSet={activeFocusSet}
          elapsedMs={elapsedMs}
          feedback={feedback}
          lastAttempt={lastAttempt}
          mode={mode}
          nextWorkoutRationale={nextWorkoutRationale}
          onModeChange={setMode}
          onEndSession={endSession}
          onChangeSessionType={() => setArea("settings")}
          onNext={nextPrompt}
          onPauseToggle={togglePause}
          onReviewProgress={() => setArea("progress")}
          onRepeat={repeatPrompt}
          onStartNewSession={startNewSession}
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
          postSessionSummary={postSessionSummary}
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
          nextWorkoutFocus={getNextWorkoutFocus(appState.mastery, appState.currentLevel)}
          nextWorkoutRationale={nextWorkoutRationale}
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
  activeFocusSet: string;
  appState: AppState;
  audioStatus: string;
  detectedPitch: PitchDetection | null;
  elapsedMs: number;
  feedback: string;
  lastAttempt: Attempt | null;
  listening: boolean;
  micEnabled: boolean;
  mode: DrillMode;
  nextWorkoutRationale: ReturnType<typeof getNextWorkoutRationale>;
  onChangeSessionType: () => void;
  onModeChange: (mode: DrillMode) => void;
  onEndSession: () => void;
  onNext: () => void;
  onPauseToggle: () => void;
  onReviewProgress: () => void;
  onRepeat: () => void;
  onStartNewSession: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleFretboard: () => void;
  paused: boolean;
  postSessionSummary: PostSessionSummary | null;
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
  const promptResult = getPromptResult(props.lastAttempt, props.tigerLocked);
  const promptStringInstruction =
    props.prompt.type === "guided_string_note" && props.prompt.targetString
      ? `${formatStringName(props.prompt.targetString)} string`
      : "Any string";

  if (props.postSessionSummary) {
    return (
      <section className="practice-grid">
        <PostSessionPanel
          nextWorkoutRationale={props.nextWorkoutRationale}
          onChangeSessionType={props.onChangeSessionType}
          onReviewProgress={props.onReviewProgress}
          onStartNewSession={props.onStartNewSession}
          summary={props.postSessionSummary}
        />
        <aside className="coach-panel">
          <p className="eyebrow">Coach</p>
          <h3>Session logged.</h3>
          <p>Pick the next move deliberately.</p>
        </aside>
      </section>
    );
  }

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
          <div>
            <p className="eyebrow">Focus</p>
            <strong>{props.activeFocusSet}</strong>
            <span>Current set</span>
          </div>
        </div>
        <p className="timer">{props.paused ? "Paused" : `${Math.round(props.elapsedMs / 100) / 10}s`}</p>
        <div className="prompt-target">
          <div className="prompt-lines" aria-label={`Play ${props.prompt.targetDisplayName}. ${promptStringInstruction}.`}>
            <h2>Play {props.prompt.targetDisplayName}</h2>
            <p>{promptStringInstruction}</p>
          </div>
          {promptResult && (
            <div className={`prompt-result ${promptResult.tone}`} aria-live="polite">
              <strong>{promptResult.label}</strong>
              <span>{promptResult.detail}</span>
            </div>
          )}
        </div>
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

function PostSessionPanel(props: {
  nextWorkoutRationale: ReturnType<typeof getNextWorkoutRationale>;
  onChangeSessionType: () => void;
  onReviewProgress: () => void;
  onStartNewSession: () => void;
  summary: PostSessionSummary;
}): ReactElement {
  return (
    <section className="prompt-panel status-panel">
      <p className="eyebrow">Session Complete</p>
      <h2>Logged.</h2>
      <dl>
        <div>
          <dt>Attempts</dt>
          <dd>{props.summary.attemptCount}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{props.summary.accuracyPercent}%</dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>{props.summary.averageResponseMs}ms</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(props.summary.activePracticeMs)}</dd>
        </div>
        <div>
          <dt>Misses</dt>
          <dd>{props.summary.resultCounts.wrong_note}</dd>
        </div>
        <div>
          <dt>Too slow</dt>
          <dd>{props.summary.resultCounts.too_slow}</dd>
        </div>
      </dl>
      <div className="listener-panel">
        <p className="eyebrow">Next focus</p>
        <strong>{props.summary.weakestNotes.length === 0 ? "Clean session" : props.summary.weakestNotes.join(", ")}</strong>
        <span>Based on misses and slow answers from this session.</span>
      </div>
      <div className="listener-panel">
        <p className="eyebrow">Why</p>
        <strong>{props.nextWorkoutRationale.headline}</strong>
        <span>{props.nextWorkoutRationale.detail}</span>
      </div>
      <div className="actions">
        <button className="primary" onClick={props.onStartNewSession}>
          Start another session
        </button>
        <button onClick={props.onReviewProgress}>Review progress</button>
        <button onClick={props.onChangeSessionType}>Change session type</button>
      </div>
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
  nextWorkoutRationale: ReturnType<typeof getNextWorkoutRationale>;
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
          <p className="eyebrow rationale-label">Why this focus</p>
          <p className="summary-note">
            <strong>{props.nextWorkoutRationale.headline}</strong>
            <span>{props.nextWorkoutRationale.detail}</span>
          </p>
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
      <AudioDiagnostics attempts={props.appState.attempts} />
      <RecentAttempts attempts={props.recentAttempts} />
    </section>
  );
}

function AudioDiagnostics(props: { attempts: Attempt[] }): ReactElement {
  const diagnosticAttempts = props.attempts
    .filter((attempt) => attempt.source === "microphone" && attempt.audioDiagnostic)
    .slice(-6)
    .reverse();

  return (
    <section className="metric-panel">
      <p className="eyebrow">Audio diagnostics</p>
      <div className="attempt-list">
        {diagnosticAttempts.length === 0 && <p>No microphone diagnostics yet.</p>}
        {diagnosticAttempts.map((attempt) => (
          <div className="attempt-row diagnostic-row" key={attempt.id}>
            <span>{getDisplayName(attempt.targetPitchClass)}</span>
            <span>{attempt.submittedDisplayName ?? "-"}</span>
            <span>{attempt.audioDiagnostic?.frequencyHz}Hz</span>
            <span>{formatCents(attempt.audioDiagnostic?.centsFromTarget ?? 0)}</span>
            <span>{attempt.audioDiagnostic?.stableMs}ms</span>
            <span>{attempt.result}</span>
          </div>
        ))}
      </div>
      <p className="helper-text">Target, heard, frequency, cents, stable time, result.</p>
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

function buildPostSessionSummary(params: {
  activePracticeMs: number;
  attemptIds: string[];
  attempts: Attempt[];
  sessionId: string;
}): PostSessionSummary {
  const attemptsById = new Map(params.attempts.map((attempt) => [attempt.id, attempt]));
  const sessionAttempts = params.attemptIds
    .map((attemptId) => attemptsById.get(attemptId))
    .filter((attempt): attempt is Attempt => Boolean(attempt));
  const resultCounts = {
    pass: sessionAttempts.filter((attempt) => attempt.result === "pass").length,
    wrong_note: sessionAttempts.filter((attempt) => attempt.result === "wrong_note").length,
    too_slow: sessionAttempts.filter((attempt) => attempt.result === "too_slow").length
  };
  const totalResponseMs = sessionAttempts.reduce((sum, attempt) => sum + attempt.responseMs, 0);
  const weakNoteScores = new Map<number, number>();

  sessionAttempts.forEach((attempt) => {
    const penalty = attempt.result === "wrong_note" ? 2 : attempt.result === "too_slow" ? 1 : 0;
    if (penalty > 0) {
      weakNoteScores.set(attempt.targetPitchClass, (weakNoteScores.get(attempt.targetPitchClass) ?? 0) + penalty);
    }
  });

  return {
    sessionId: params.sessionId,
    attemptCount: sessionAttempts.length,
    accuracyPercent: sessionAttempts.length === 0 ? 0 : Math.round((resultCounts.pass / sessionAttempts.length) * 100),
    averageResponseMs: sessionAttempts.length === 0 ? 0 : Math.round(totalResponseMs / sessionAttempts.length),
    activePracticeMs: params.activePracticeMs,
    resultCounts,
    weakestNotes: Array.from(weakNoteScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pitchClass]) => getDisplayName(pitchClass))
  };
}

function getPromptResult(attempt: Attempt | null, tigerLocked: boolean): PromptResult | null {
  if (attempt) {
    if (attempt.result === "pass") {
      return {
        tone: "correct",
        label: "Correct",
        detail: `Heard ${attempt.submittedDisplayName ?? "-"}`
      };
    }

    if (attempt.result === "too_slow") {
      return {
        tone: "slow",
        label: "Too slow",
        detail: `Heard ${attempt.submittedDisplayName ?? "-"}`
      };
    }

    return {
      tone: "miss",
      label: "Missed",
      detail: `Heard ${attempt.submittedDisplayName ?? "-"}`
    };
  }

  if (tigerLocked) {
    return {
      tone: "locked",
      label: "Locked until clean",
      detail: "Same note. Get it right."
    };
  }

  return null;
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
