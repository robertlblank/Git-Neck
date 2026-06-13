import type { AppState, Attempt, PracticeSession, SessionStructure } from "./types";

export type SessionStructureConfig = {
  structure: SessionStructure;
  label: string;
  segmentCount: number;
  segmentDurationMinutes: number;
};

export type SessionTrend = {
  sessionId: string;
  label: string;
  attempts: number;
  accuracyPercent: number;
  averageResponseMs: number;
  activePracticeMs: number;
};

export const SESSION_STRUCTURES: SessionStructureConfig[] = [
  { structure: "one_15", label: "1 x 15 minutes", segmentCount: 1, segmentDurationMinutes: 15 },
  { structure: "three_5", label: "3 x 5 minutes", segmentCount: 3, segmentDurationMinutes: 5 },
  { structure: "five_3", label: "5 x 3 minutes", segmentCount: 5, segmentDurationMinutes: 3 }
];

export function getSessionStructureConfig(structure: SessionStructure): SessionStructureConfig {
  return SESSION_STRUCTURES.find((entry) => entry.structure === structure) ?? SESSION_STRUCTURES[0];
}

export function getCompletedSegments(activePracticeMs: number, structure: SessionStructure): number {
  const config = getSessionStructureConfig(structure);
  const segmentMs = config.segmentDurationMinutes * 60_000;
  return Math.min(config.segmentCount, Math.floor(activePracticeMs / segmentMs));
}

export function getCurrentSegment(activePracticeMs: number, structure: SessionStructure): number {
  const config = getSessionStructureConfig(structure);
  return Math.min(config.segmentCount, getCompletedSegments(activePracticeMs, structure) + 1);
}

export function getSessionTargetMs(structure: SessionStructure): number {
  const config = getSessionStructureConfig(structure);
  return config.segmentCount * config.segmentDurationMinutes * 60_000;
}

export function getSessionSegmentRemainingMs(activePracticeMs: number, structure: SessionStructure): number {
  const config = getSessionStructureConfig(structure);
  const segmentMs = config.segmentDurationMinutes * 60_000;
  const elapsedInSegment = activePracticeMs % segmentMs;
  return Math.max(0, segmentMs - elapsedInSegment);
}

export function createCompletedPracticeSession(params: {
  id: string;
  mode: PracticeSession["mode"];
  structure: SessionStructure;
  startedAtMs: number;
  endedAtMs: number;
  activePracticeMs: number;
  attemptIds: string[];
}): PracticeSession {
  const config = getSessionStructureConfig(params.structure);

  return {
    id: params.id,
    mode: params.mode,
    structure: params.structure,
    segmentCount: config.segmentCount,
    segmentDurationMinutes: config.segmentDurationMinutes,
    startedAtMs: params.startedAtMs,
    endedAtMs: params.endedAtMs,
    activePracticeMs: params.activePracticeMs,
    completedSegments: getCompletedSegments(params.activePracticeMs, params.structure),
    attemptIds: params.attemptIds
  };
}

export function getSessionTrends(appState: AppState, count = 5): SessionTrend[] {
  const attemptsById = new Map(appState.attempts.map((attempt) => [attempt.id, attempt]));

  return appState.sessions
    .slice(-count)
    .reverse()
    .map((session, index) => {
      const attempts = session.attemptIds
        .map((attemptId) => attemptsById.get(attemptId))
        .filter((attempt): attempt is Attempt => Boolean(attempt));
      const correct = attempts.filter((attempt) => attempt.result === "pass").length;
      const totalResponseMs = attempts.reduce((sum, attempt) => sum + attempt.responseMs, 0);

      return {
        sessionId: session.id,
        label: `Session ${appState.sessions.length - index}`,
        attempts: attempts.length,
        accuracyPercent: attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100),
        averageResponseMs: attempts.length === 0 ? 0 : Math.round(totalResponseMs / attempts.length),
        activePracticeMs: session.activePracticeMs
      };
    });
}
