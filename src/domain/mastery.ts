import { PITCH_CLASSES } from "./notes";
import type { Attempt, MasteryState, PitchMastery } from "./types";

export function createInitialMasteryState(): MasteryState {
  return {
    byPitchClass: Object.fromEntries(
      PITCH_CLASSES.map((pitchClass) => [String(pitchClass.value), createPitchMastery(pitchClass.value)])
    )
  };
}

export function updateMastery(mastery: MasteryState, attempt: Attempt): MasteryState {
  const existing = mastery.byPitchClass[String(attempt.targetPitchClass)] ?? createPitchMastery(attempt.targetPitchClass);
  const cleanPass = attempt.result === "pass";
  const slowOrWrong = attempt.result === "too_slow" || attempt.result === "wrong_note";
  const nextScore = clamp(
    existing.score + (cleanPass ? 8 : 0) - (attempt.result === "wrong_note" ? 7 : 0) - (attempt.result === "too_slow" ? 3 : 0),
    0,
    100
  );

  const next: PitchMastery = {
    ...existing,
    attempts: existing.attempts + 1,
    correct: existing.correct + (attempt.wasCorrect ? 1 : 0),
    wrong: existing.wrong + (attempt.result === "wrong_note" ? 1 : 0),
    slow: existing.slow + (attempt.result === "too_slow" ? 1 : 0),
    cleanStreak: cleanPass ? existing.cleanStreak + 1 : 0,
    bestCleanStreak: cleanPass ? Math.max(existing.bestCleanStreak, existing.cleanStreak + 1) : existing.bestCleanStreak,
    score: slowOrWrong || cleanPass ? nextScore : existing.score,
    totalResponseMs: existing.totalResponseMs + attempt.responseMs,
    lastAttemptAtMs: attempt.createdAtMs,
    lastWrongSubmittedPitchClass:
      attempt.result === "wrong_note" ? attempt.submittedPitchClass : existing.lastWrongSubmittedPitchClass
  };

  return {
    byPitchClass: {
      ...mastery.byPitchClass,
      [String(attempt.targetPitchClass)]: next
    }
  };
}

export function getWeakestPitchClasses(mastery: MasteryState, count = 3): PitchMastery[] {
  return Object.values(mastery.byPitchClass)
    .slice()
    .sort((a, b) => a.score - b.score || b.attempts - a.attempts)
    .slice(0, count);
}

export function getStrongestPitchClasses(mastery: MasteryState, count = 3): PitchMastery[] {
  return Object.values(mastery.byPitchClass)
    .slice()
    .sort((a, b) => b.score - a.score || b.bestCleanStreak - a.bestCleanStreak)
    .slice(0, count);
}

export function getSlowestPitchClasses(mastery: MasteryState, count = 3): PitchMastery[] {
  return Object.values(mastery.byPitchClass)
    .filter((entry) => entry.attempts > 0)
    .sort((a, b) => averageResponseMs(b) - averageResponseMs(a))
    .slice(0, count);
}

export function averageResponseMs(mastery: PitchMastery): number {
  return mastery.attempts === 0 ? 0 : Math.round(mastery.totalResponseMs / mastery.attempts);
}

function createPitchMastery(pitchClass: number): PitchMastery {
  return {
    pitchClass,
    attempts: 0,
    correct: 0,
    wrong: 0,
    slow: 0,
    cleanStreak: 0,
    bestCleanStreak: 0,
    score: 20,
    totalResponseMs: 0,
    lastAttemptAtMs: null,
    lastWrongSubmittedPitchClass: null
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
