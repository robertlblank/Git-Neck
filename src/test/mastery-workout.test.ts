import { describe, expect, it } from "vitest";
import { createDrillPrompt } from "../domain/drills";
import { createInitialMasteryState, updateMastery } from "../domain/mastery";
import { scoreAttempt } from "../domain/scoring";
import { getNextWorkoutFocus, getTrainingSelectionPlan, getWorkoutPlan, selectNextPrompt } from "../domain/workout";

function attemptFor(targetPitchClass: number, submittedPitchClass: number, responseMs = 900) {
  const prompt = createDrillPrompt({
    id: `prompt-${targetPitchClass}`,
    type: "note",
    targetPitchClass,
    nowMs: 1000
  });

  return scoreAttempt({
    prompt,
    mode: "daily",
    submittedPitchClass,
    submittedDisplayName: null,
    source: "microphone",
    responseMs,
    previousAttempts: [],
    nowMs: 2000
  }).attempt;
}

describe("mastery and workout", () => {
  it("wrong attempts lower or maintain mastery", () => {
    const initial = createInitialMasteryState();
    const before = initial.byPitchClass["0"].score;
    const next = updateMastery(initial, attemptFor(0, 5));
    expect(next.byPitchClass["0"].score).toBeLessThanOrEqual(before);
  });

  it("correct attempts improve mastery", () => {
    const initial = createInitialMasteryState();
    const before = initial.byPitchClass["0"].score;
    const next = updateMastery(initial, attemptFor(0, 0));
    expect(next.byPitchClass["0"].score).toBeGreaterThan(before);
  });

  it("weak notes are prioritized in daily workout", () => {
    const mastery = createInitialMasteryState();
    for (const entry of Object.values(mastery.byPitchClass)) {
      entry.score = 90;
    }
    mastery.byPitchClass["0"].score = 1;

    const prompt = selectNextPrompt({
      mastery,
      currentLevel: 1,
      nowMs: 3000,
      mode: "daily",
      seed: 1
    });

    expect(prompt.targetPitchClass).toBe(0);
  });

  it("daily workout starts with the first curriculum focus group", () => {
    const mastery = createInitialMasteryState();

    const prompts = Array.from({ length: 12 }, (_, index) =>
      selectNextPrompt({
        mastery,
        currentLevel: 1,
        nowMs: 3000 + index,
        mode: "daily",
        seed: index + 1
      })
    );

    expect(new Set(prompts.map((prompt) => prompt.targetPitchClass))).toEqual(new Set([0, 2, 7]));
  });

  it("daily workout advances to the next focus group after the current group is ready", () => {
    const mastery = createInitialMasteryState();
    [0, 2, 7].forEach((pitchClass) => {
      mastery.byPitchClass[String(pitchClass)].attempts = 1;
      mastery.byPitchClass[String(pitchClass)].score = 60;
    });

    const plan = getWorkoutPlan(mastery, 1);

    expect(plan.activePitchClasses).toEqual([9, 4]);
    expect(plan.reviewPitchClasses).toEqual([0, 7, 2]);
    expect(plan.availablePitchClasses).toEqual([0, 7, 2, 9, 4]);
  });

  it("next workout focus names the active set and weakest review notes", () => {
    const mastery = createInitialMasteryState();
    mastery.byPitchClass["0"].score = 5;

    expect(getNextWorkoutFocus(mastery, 1)).toBe("Current set: C, G, D. Weakest: C, D, G");
  });

  it("daily workout prioritizes slow recall inside the current focus", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(2, 2, 3400),
      attemptFor(2, 2, 3500),
      attemptFor(2, 2, 3600)
    ];

    const prompt = selectNextPrompt({
      mastery,
      attempts,
      currentLevel: 1,
      nowMs: 5000,
      mode: "daily",
      seed: 1
    });

    expect(prompt.targetPitchClass).toBe(2);
  });

  it("daily workout prioritizes repeated confusions as contrast work", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(7, 5),
      attemptFor(7, 5)
    ];

    const prompt = selectNextPrompt({
      mastery,
      attempts,
      currentLevel: 1,
      nowMs: 5000,
      mode: "daily",
      seed: 1
    });

    expect(prompt.targetPitchClass).toBe(7);
  });

  it("daily workout uses the review bucket for retention-due notes", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(0, 0),
      attemptFor(0, 0),
      attemptFor(0, 0)
    ];

    const prompt = selectNextPrompt({
      mastery,
      attempts,
      currentLevel: 1,
      nowMs: 2000 + 24 * 60 * 60 * 1000,
      mode: "daily",
      seed: 90000
    });

    expect(prompt.targetPitchClass).toBe(0);
  });

  it("training selection plan exposes diagnosis buckets for workout selection", () => {
    const attempts = [
      attemptFor(2, 2, 3400),
      attemptFor(2, 2, 3500),
      attemptFor(2, 2, 3600),
      attemptFor(7, 5),
      attemptFor(7, 5)
    ];

    const plan = getTrainingSelectionPlan({
      attempts,
      nowMs: 5000,
      pitchClasses: [0, 2, 7]
    });

    expect(plan.activePitchClasses).toEqual([2]);
    expect(plan.contrastPitchClasses).toEqual([7]);
  });
});
