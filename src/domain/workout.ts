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

  const type = pick(level.drillTypes, rng);
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

export type TrainingSelectionPlan = {
  activePitchClasses: number[];
  contrastPitchClasses: number[];
  reviewPitchClasses: number[];
  assessments: TrainingSkillAssessment[];
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
