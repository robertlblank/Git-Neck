import { getDisplayName } from "./notes";
import type { Attempt, ScoringInput, ScoringOutcome } from "./types";

const CLEAN_STREAK_TARGET = 5;
const NORMAL_TARGET_MS = 3000;
const PRESSURE_TARGET_MS = 1800;

export function scoreAttempt(input: ScoringInput): ScoringOutcome {
  const targetMs = input.mode === "test" ? PRESSURE_TARGET_MS : NORMAL_TARGET_MS;
  const correctPitch = input.submittedPitchClass === input.prompt.targetPitchClass;
  const repeatedMistake = isRepeatedMistake(input);
  const cleanStreakCount = getCleanStreakCount(input.previousAttempts, input.prompt.targetPitchClass);

  let result: Attempt["result"] = "pass";
  let wasCorrect = true;
  let nextCleanStreak = cleanStreakCount + 1;

  if (!correctPitch) {
    result = "wrong_note";
    wasCorrect = false;
    nextCleanStreak = 0;
  } else if (input.responseMs > targetMs) {
    result = "too_slow";
    wasCorrect = true;
    nextCleanStreak = 0;
  }

  const attempt: Attempt = {
    id: `attempt-${input.nowMs}`,
    promptId: input.prompt.id,
    mode: input.mode,
    targetPitchClass: input.prompt.targetPitchClass,
    targetString: input.prompt.targetString,
    submittedPitchClass: input.submittedPitchClass,
    submittedDisplayName:
      input.submittedDisplayName ??
      (input.submittedPitchClass === null ? null : getDisplayName(input.submittedPitchClass)),
    wasCorrect,
    responseMs: input.responseMs,
    verbalConfirmed: input.verbalConfirmed ?? true,
    source: input.source,
    result,
    repeatedMistake,
    cleanStreakCount: nextCleanStreak,
    cleanStreakPassed: result === "pass" && nextCleanStreak >= CLEAN_STREAK_TARGET,
    audioDiagnostic: input.audioDiagnostic,
    createdAtMs: input.nowMs
  };

  return { attempt, targetMs };
}

function getCleanStreakCount(previousAttempts: Attempt[], targetPitchClass: number): number {
  let count = 0;

  for (let index = previousAttempts.length - 1; index >= 0; index -= 1) {
    const attempt = previousAttempts[index];
    if (attempt.targetPitchClass !== targetPitchClass) {
      continue;
    }

    if (attempt.result === "pass") {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}

function isRepeatedMistake(input: ScoringInput): boolean {
  if (
    input.submittedPitchClass === null ||
    input.submittedPitchClass === input.prompt.targetPitchClass
  ) {
    return false;
  }

  return input.previousAttempts.some(
    (attempt) =>
      attempt.targetPitchClass === input.prompt.targetPitchClass &&
      attempt.submittedPitchClass === input.submittedPitchClass &&
      attempt.result === "wrong_note"
  );
}
