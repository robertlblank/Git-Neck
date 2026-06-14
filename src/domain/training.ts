import { getDisplayName } from "./notes";
import type { Attempt, GuitarString } from "./types";

export type TrainingSkillKind = "pitch_class" | "string_pitch" | "confusion_pair" | "retention";

export type TrainingSkillId =
  | `pitch_class:${number}`
  | `string_pitch:${GuitarString}:${number}`
  | `confusion_pair:${number}:${number}`
  | `retention:${number}`;

export type TrainingSkillState =
  | "unseen"
  | "introduced"
  | "learning"
  | "accurate"
  | "automatic"
  | "retained"
  | "weak_accuracy"
  | "slow_recall"
  | "repeated_confusion"
  | "retention_failed"
  | "under_sampled";

export type TrainingPrescription = "active" | "review" | "expand" | "contrast";

export type TrainingSkillAssessment = {
  id: TrainingSkillId;
  kind: TrainingSkillKind;
  state: TrainingSkillState;
  prescription: TrainingPrescription;
  targetPitchClass: number;
  targetString?: GuitarString;
  confusedWithPitchClass?: number;
  attempts: number;
  passRate: number;
  averageResponseMs: number;
  cleanStreak: number;
  lastAttemptAtMs: number | null;
  label: string;
};

const MIN_ACCURACY_SAMPLE = 3;
const MIN_AUTOMATIC_SAMPLE = 5;
const ACCURATE_PASS_RATE = 0.8;
const AUTOMATIC_TARGET_MS = 1500;
const SLOW_TARGET_MS = 3000;
const RETENTION_DUE_MS = 24 * 60 * 60 * 1000;

export function createPitchClassSkillId(pitchClass: number): TrainingSkillId {
  return `pitch_class:${pitchClass}`;
}

export function createStringPitchSkillId(stringName: GuitarString, pitchClass: number): TrainingSkillId {
  return `string_pitch:${stringName}:${pitchClass}`;
}

export function createConfusionPairSkillId(targetPitchClass: number, confusedWithPitchClass: number): TrainingSkillId {
  return `confusion_pair:${targetPitchClass}:${confusedWithPitchClass}`;
}

export function createRetentionSkillId(pitchClass: number): TrainingSkillId {
  return `retention:${pitchClass}`;
}

export function assessPitchClassSkill(params: {
  attempts: Attempt[];
  nowMs: number;
  pitchClass: number;
}): TrainingSkillAssessment {
  const relevantAttempts = params.attempts.filter((attempt) => attempt.targetPitchClass === params.pitchClass);
  const base = summarizeAttempts(relevantAttempts);
  const repeatedConfusion = getRepeatedConfusion(relevantAttempts);
  const state = getRecallState({
    ...base,
    hasRepeatedConfusion: repeatedConfusion !== null,
    retentionDue: isRetentionDue(base.lastAttemptAtMs, params.nowMs)
  });

  return {
    ...base,
    id: createPitchClassSkillId(params.pitchClass),
    kind: "pitch_class",
    state,
    prescription: getPrescription(state),
    targetPitchClass: params.pitchClass,
    confusedWithPitchClass: repeatedConfusion ?? undefined,
    label: getDisplayName(params.pitchClass)
  };
}

export function assessStringPitchSkill(params: {
  attempts: Attempt[];
  nowMs: number;
  pitchClass: number;
  stringName: GuitarString;
}): TrainingSkillAssessment {
  const relevantAttempts = params.attempts.filter(
    (attempt) => attempt.targetPitchClass === params.pitchClass && attempt.targetString === params.stringName
  );
  const base = summarizeAttempts(relevantAttempts);
  const state = getRecallState({
    ...base,
    hasRepeatedConfusion: getRepeatedConfusion(relevantAttempts) !== null,
    retentionDue: isRetentionDue(base.lastAttemptAtMs, params.nowMs)
  });

  return {
    ...base,
    id: createStringPitchSkillId(params.stringName, params.pitchClass),
    kind: "string_pitch",
    state,
    prescription: getPrescription(state),
    targetPitchClass: params.pitchClass,
    targetString: params.stringName,
    label: `${getDisplayName(params.pitchClass)} on ${params.stringName}`
  };
}

export function assessConfusionPairSkill(params: {
  attempts: Attempt[];
  confusedWithPitchClass: number;
  targetPitchClass: number;
}): TrainingSkillAssessment {
  const relevantAttempts = params.attempts.filter(
    (attempt) =>
      attempt.targetPitchClass === params.targetPitchClass &&
      attempt.submittedPitchClass === params.confusedWithPitchClass &&
      attempt.result === "wrong_note"
  );
  const base = summarizeAttempts(relevantAttempts);
  const state: TrainingSkillState = relevantAttempts.length >= 2 ? "repeated_confusion" : "under_sampled";

  return {
    ...base,
    id: createConfusionPairSkillId(params.targetPitchClass, params.confusedWithPitchClass),
    kind: "confusion_pair",
    state,
    prescription: state === "repeated_confusion" ? "contrast" : "active",
    targetPitchClass: params.targetPitchClass,
    confusedWithPitchClass: params.confusedWithPitchClass,
    label: `${getDisplayName(params.targetPitchClass)} vs ${getDisplayName(params.confusedWithPitchClass)}`
  };
}

function getRecallState(params: {
  attempts: number;
  passRate: number;
  averageResponseMs: number;
  cleanStreak: number;
  hasRepeatedConfusion: boolean;
  retentionDue: boolean;
}): TrainingSkillState {
  if (params.attempts === 0) {
    return "unseen";
  }

  if (params.hasRepeatedConfusion) {
    return "repeated_confusion";
  }

  if (params.retentionDue) {
    return "retention_failed";
  }

  if (params.attempts < MIN_ACCURACY_SAMPLE) {
    return params.passRate > 0 ? "introduced" : "under_sampled";
  }

  if (params.passRate < ACCURATE_PASS_RATE) {
    return "weak_accuracy";
  }

  if (params.averageResponseMs > SLOW_TARGET_MS) {
    return "slow_recall";
  }

  if (
    params.attempts >= MIN_AUTOMATIC_SAMPLE &&
    params.cleanStreak >= MIN_AUTOMATIC_SAMPLE &&
    params.averageResponseMs <= AUTOMATIC_TARGET_MS
  ) {
    return "automatic";
  }

  if (params.cleanStreak >= MIN_ACCURACY_SAMPLE) {
    return "accurate";
  }

  return "learning";
}

function getPrescription(state: TrainingSkillState): TrainingPrescription {
  if (state === "automatic" || state === "retained") {
    return "expand";
  }

  if (state === "retention_failed") {
    return "review";
  }

  if (state === "repeated_confusion") {
    return "contrast";
  }

  return "active";
}

function summarizeAttempts(attempts: Attempt[]): Omit<
  TrainingSkillAssessment,
  "id" | "kind" | "state" | "prescription" | "targetPitchClass" | "targetString" | "confusedWithPitchClass" | "label"
> {
  const pitchCorrectAttempts = attempts.filter((attempt) => attempt.wasCorrect);
  const totalResponseMs = attempts.reduce((sum, attempt) => sum + attempt.responseMs, 0);
  const lastAttempt = attempts.slice().sort((a, b) => b.createdAtMs - a.createdAtMs)[0] ?? null;

  return {
    attempts: attempts.length,
    passRate: attempts.length === 0 ? 0 : pitchCorrectAttempts.length / attempts.length,
    averageResponseMs: attempts.length === 0 ? 0 : Math.round(totalResponseMs / attempts.length),
    cleanStreak: lastAttempt?.cleanStreakCount ?? 0,
    lastAttemptAtMs: lastAttempt?.createdAtMs ?? null
  };
}

function getRepeatedConfusion(attempts: Attempt[]): number | null {
  const wrongCounts = new Map<number, number>();

  attempts.forEach((attempt) => {
    if (attempt.result === "wrong_note" && attempt.submittedPitchClass !== null) {
      wrongCounts.set(attempt.submittedPitchClass, (wrongCounts.get(attempt.submittedPitchClass) ?? 0) + 1);
    }
  });

  const repeated = Array.from(wrongCounts.entries()).find(([, count]) => count >= 2);
  return repeated?.[0] ?? null;
}

function isRetentionDue(lastAttemptAtMs: number | null, nowMs: number): boolean {
  return lastAttemptAtMs !== null && nowMs - lastAttemptAtMs >= RETENTION_DUE_MS;
}
