import { getCurrentLevel } from "./curriculum";
import { createDrillPrompt } from "./drills";
import { getWeakestPitchClasses } from "./mastery";
import { PITCH_CLASSES } from "./notes";
import { assessPitchClassSkill, type TrainingSkillAssessment } from "./training";
import type { Attempt, DrillPrompt, GuitarString, MasteryState, PitchMastery } from "./types";

const GUIDED_STRINGS: GuitarString[] = ["lowE", "A", "D", "G", "B", "highE"];
const FOCUS_GROUP_READY_SCORE = 55;

export function selectNextPrompt(params: {
  mastery: MasteryState;
  currentLevel: number;
  nowMs: number;
  mode: "daily" | "free" | "test";
  attempts?: Attempt[];
  seed?: number;
}): DrillPrompt {
  const level = getCurrentLevel(params.currentLevel);
  const rng = createSeededRng(params.seed ?? params.nowMs);
  const sourceRoll = rng();
  const plan = getWorkoutPlan(params.mastery, params.currentLevel);
  const dailyPitchClasses = params.mode === "daily" ? plan.availablePitchClasses : level.pitchClasses;
  const trainingPlan = getTrainingSelectionPlan({
    attempts: params.attempts ?? [],
    nowMs: params.nowMs,
    pitchClasses: dailyPitchClasses
  });
  const weakPitchClasses = getWeakestPitchClasses(params.mastery, 12)
    .map((entry) => entry.pitchClass)
    .filter((pitchClass) => dailyPitchClasses.includes(pitchClass));

  let targetPitchClass: number;

  if (params.mode === "daily" && sourceRoll < 0.6) {
    targetPitchClass = pick(
      firstNonEmpty([
        trainingPlan.contrastPitchClasses,
        trainingPlan.activePitchClasses,
        weakPitchClasses,
        plan.activePitchClasses
      ]),
      rng
    );
  } else if (params.mode === "daily" && sourceRoll < 0.85) {
    targetPitchClass = pick(
      firstNonEmpty([trainingPlan.reviewPitchClasses, plan.reviewPitchClasses, plan.activePitchClasses]),
      rng
    );
  } else {
    const newPitchClasses = params.mode === "daily" ? plan.activePitchClasses : level.pitchClasses;
    const untried = newPitchClasses.filter(
      (pitchClass) => params.mastery.byPitchClass[String(pitchClass)]?.attempts === 0
    );
    targetPitchClass = pick(untried.length > 0 ? untried : newPitchClasses, rng);
  }

  const drillTypes = getDrillTypesForPrompt({
    currentLevel: params.currentLevel,
    mode: params.mode,
    plan,
    levelDrillTypes: level.drillTypes
  });
  const type = pick(drillTypes, rng);
  const targetString = type === "guided_string_note" ? pick(GUIDED_STRINGS, rng) : undefined;

  return createDrillPrompt({
    id: `prompt-${params.nowMs}`,
    type,
    targetPitchClass,
    targetString,
    nowMs: params.nowMs
  });
}

export type WorkoutPlan = {
  levelName: string;
  activeGroupIndex: number;
  activePitchClasses: number[];
  reviewPitchClasses: number[];
  availablePitchClasses: number[];
};

export function getDrillTypesForPrompt(params: {
  currentLevel: number;
  levelDrillTypes: DrillPrompt["type"][];
  mode: "daily" | "free" | "test";
  plan: WorkoutPlan;
}): DrillPrompt["type"][] {
  if (
    params.mode === "daily" &&
    params.currentLevel === 1 &&
    params.plan.reviewPitchClasses.length > 0
  ) {
    return ["note", "note", "note", "guided_string_note"];
  }

  return params.levelDrillTypes;
}

export type TrainingSelectionPlan = {
  activePitchClasses: number[];
  contrastPitchClasses: number[];
  reviewPitchClasses: number[];
  assessments: TrainingSkillAssessment[];
};

export type WorkoutRationale = {
  headline: string;
  detail: string;
};

export function getWorkoutPlan(mastery: MasteryState, currentLevel: number): WorkoutPlan {
  const level = getCurrentLevel(currentLevel);
  const focusGroups = level.focusGroups.length > 0 ? level.focusGroups : [level.pitchClasses];
  const activeGroupIndex = focusGroups.findIndex((group) => !isFocusGroupReady(group, mastery));
  const safeActiveGroupIndex = activeGroupIndex === -1 ? focusGroups.length - 1 : activeGroupIndex;
  const activePitchClasses = focusGroups[safeActiveGroupIndex];
  const reviewPitchClasses = uniquePitchClasses(focusGroups.slice(0, safeActiveGroupIndex).flat());
  const availablePitchClasses = uniquePitchClasses([...reviewPitchClasses, ...activePitchClasses]);

  return {
    levelName: level.name,
    activeGroupIndex: safeActiveGroupIndex,
    activePitchClasses,
    reviewPitchClasses,
    availablePitchClasses
  };
}

export function getNextWorkoutFocus(mastery: MasteryState, currentLevel = 1): string {
  const plan = getWorkoutPlan(mastery, currentLevel);
  const active = plan.activePitchClasses.map((pitchClass) => PITCH_CLASSES[pitchClass].displayName).join(", ");
  const weakest = getWeakestPitchClasses(mastery, 12)
    .map((entry) => entry.pitchClass)
    .filter((pitchClass) => plan.availablePitchClasses.includes(pitchClass))
    .slice(0, 3)
    .map((pitchClass) => PITCH_CLASSES[pitchClass].displayName);

  if (weakest.length > 0) {
    return `Current set: ${active}. Weakest: ${weakest.join(", ")}`;
  }

  return `Current set: ${active}`;
}

export function getNextWorkoutRationale(params: {
  attempts: Attempt[];
  currentLevel: number;
  mastery: MasteryState;
  nowMs: number;
}): WorkoutRationale {
  const plan = getWorkoutPlan(params.mastery, params.currentLevel);
  const trainingPlan = getTrainingSelectionPlan({
    attempts: params.attempts,
    nowMs: params.nowMs,
    pitchClasses: plan.availablePitchClasses
  });

  const contrast = trainingPlan.assessments.filter((assessment) => assessment.state === "repeated_confusion");
  if (contrast.length > 0) {
    const pair = contrast[0];
    const confusedWith =
      pair.confusedWithPitchClass === undefined ? "nearby note" : PITCH_CLASSES[pair.confusedWithPitchClass].displayName;
    return {
      headline: `Contrast work: ${pair.label} vs ${confusedWith}`,
      detail: "Same miss repeated. Git Neck will make that contrast deliberate."
    };
  }

  const weakAccuracy = trainingPlan.assessments.filter((assessment) => assessment.state === "weak_accuracy");
  if (weakAccuracy.length > 0) {
    return {
      headline: `Accuracy work: ${formatAssessmentLabels(weakAccuracy)}`,
      detail: "These notes are getting extra reps because misses are still showing up."
    };
  }

  const slowRecall = trainingPlan.assessments.filter((assessment) => assessment.state === "slow_recall");
  if (slowRecall.length > 0) {
    return {
      headline: `Speed work: ${formatAssessmentLabels(slowRecall)}`,
      detail: "You are finding these notes, but not automatically yet."
    };
  }

  const retention = trainingPlan.assessments.filter((assessment) => assessment.state === "retention_failed");
  if (retention.length > 0) {
    return {
      headline: `Retention review: ${formatAssessmentLabels(retention)}`,
      detail: "These notes are due after time away so they stay learned."
    };
  }

  const active = plan.activePitchClasses.map((pitchClass) => PITCH_CLASSES[pitchClass].displayName).join(", ");
  return {
    headline: `Current set: ${active}`,
    detail: "No sharp weakness is leading yet. Keep building the current set."
  };
}

export function getTrainingSelectionPlan(params: {
  attempts: Attempt[];
  nowMs: number;
  pitchClasses: number[];
}): TrainingSelectionPlan {
  const assessments = params.pitchClasses.map((pitchClass) =>
    assessPitchClassSkill({
      attempts: params.attempts,
      nowMs: params.nowMs,
      pitchClass
    })
  );

  return {
    assessments,
    contrastPitchClasses: getAssessmentPitchClasses(assessments, ["repeated_confusion"]),
    reviewPitchClasses: getAssessmentPitchClasses(assessments, ["retention_failed"]),
    activePitchClasses: getAssessmentPitchClasses(assessments, ["weak_accuracy", "slow_recall", "learning"])
  };
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function firstNonEmpty<T>(groups: T[][]): T[] {
  return groups.find((group) => group.length > 0) ?? [];
}

function getAssessmentPitchClasses(
  assessments: TrainingSkillAssessment[],
  states: TrainingSkillAssessment["state"][]
): number[] {
  return assessments
    .filter((assessment) => states.includes(assessment.state))
    .map((assessment) => assessment.targetPitchClass);
}

function formatAssessmentLabels(assessments: TrainingSkillAssessment[]): string {
  return assessments
    .slice(0, 3)
    .map((assessment) => assessment.label)
    .join(", ");
}

function isFocusGroupReady(group: number[], mastery: MasteryState): boolean {
  return group.every((pitchClass) => isPitchReady(mastery.byPitchClass[String(pitchClass)]));
}

function isPitchReady(mastery: PitchMastery | undefined): boolean {
  return Boolean(mastery && mastery.attempts > 0 && mastery.score >= FOCUS_GROUP_READY_SCORE);
}

function uniquePitchClasses(pitchClasses: number[]): number[] {
  return Array.from(new Set(pitchClasses));
}

function createSeededRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
