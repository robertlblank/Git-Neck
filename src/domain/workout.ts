import { getCurrentLevel } from "./curriculum";
import { createDrillPrompt } from "./drills";
import { getWeakestPitchClasses } from "./mastery";
import { PITCH_CLASSES } from "./notes";
import type { DrillPrompt, GuitarString, MasteryState } from "./types";

const GUIDED_STRINGS: GuitarString[] = ["lowE", "A", "D", "G", "B", "highE"];

export function selectNextPrompt(params: {
  mastery: MasteryState;
  currentLevel: number;
  nowMs: number;
  mode: "daily" | "free" | "test";
  seed?: number;
}): DrillPrompt {
  const level = getCurrentLevel(params.currentLevel);
  const rng = createSeededRng(params.seed ?? params.nowMs);
  const sourceRoll = rng();
  const weakPitchClasses = getWeakestPitchClasses(params.mastery, 5)
    .map((entry) => entry.pitchClass)
    .filter((pitchClass) => level.pitchClasses.includes(pitchClass));

  let targetPitchClass: number;

  if (params.mode === "daily" && sourceRoll < 0.6 && weakPitchClasses.length > 0) {
    targetPitchClass = pick(weakPitchClasses, rng);
  } else if (params.mode === "daily" && sourceRoll < 0.85) {
    targetPitchClass = pick(level.pitchClasses, rng);
  } else {
    const untried = level.pitchClasses.filter(
      (pitchClass) => params.mastery.byPitchClass[String(pitchClass)]?.attempts === 0
    );
    targetPitchClass = pick(untried.length > 0 ? untried : level.pitchClasses, rng);
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

export function getNextWorkoutFocus(mastery: MasteryState): string {
  const weakest = getWeakestPitchClasses(mastery, 3).map((entry) => PITCH_CLASSES[entry.pitchClass].displayName);
  return weakest.length > 0 ? weakest.join(", ") : "Natural notes";
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
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
