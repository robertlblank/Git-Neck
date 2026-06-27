import { describe, expect, it } from "vitest";
import { createDrillPrompt } from "../domain/drills";
import { createInitialMasteryState, updateMastery } from "../domain/mastery";
import { scoreAttempt } from "../domain/scoring";
import {
  getGuidedStringFocus,
  getNextWorkoutFocus,
  getNextWorkoutRationale,
  getDrillTypesForPrompt,
  getTrainingSelectionPlan,
  getWorkoutPlan,
  selectNextPrompt
} from "../domain/workout";

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

function guidedAttemptFor(
  targetPitchClass: number,
  targetString: "lowE" | "A" | "D" | "G" | "B" | "highE",
  submittedPitchClass: number,
  responseMs = 900,
  nowMs = 2000
) {
  const prompt = createDrillPrompt({
    id: `prompt-${targetString}-${targetPitchClass}-${nowMs}`,
    type: "guided_string_note",
    targetPitchClass,
    targetString,
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
    nowMs
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

  it("keeps daily workout note-only before the first focus group is ready", () => {
    const mastery = createInitialMasteryState();
    const plan = getWorkoutPlan(mastery, 1);

    expect(
      getDrillTypesForPrompt({
        currentLevel: 1,
        levelDrillTypes: ["note"],
        mode: "daily",
        plan
      })
    ).toEqual(["note"]);
  });

  it("adds a light guided-string blend after the first natural focus group is ready", () => {
    const mastery = createInitialMasteryState();
    [0, 2, 7].forEach((pitchClass) => {
      mastery.byPitchClass[String(pitchClass)].attempts = 1;
      mastery.byPitchClass[String(pitchClass)].score = 60;
    });
    const plan = getWorkoutPlan(mastery, 1);

    expect(
      getDrillTypesForPrompt({
        currentLevel: 1,
        levelDrillTypes: ["note"],
        mode: "daily",
        plan
      })
    ).toEqual(["note", "note", "note", "guided_string_note"]);
  });

  it("can select guided-string prompts after the first natural focus group is ready", () => {
    const mastery = createInitialMasteryState();
    [0, 2, 7].forEach((pitchClass) => {
      mastery.byPitchClass[String(pitchClass)].attempts = 1;
      mastery.byPitchClass[String(pitchClass)].score = 60;
    });

    const prompts = Array.from({ length: 40 }, (_, index) =>
      selectNextPrompt({
        mastery,
        currentLevel: 1,
        nowMs: 4000 + index,
        mode: "daily",
        seed: index + 1
      })
    );

    expect(prompts.some((prompt) => prompt.type === "guided_string_note" && prompt.targetString)).toBe(true);
  });

  it("keeps daily guided-string prompts on one focus string until clean passes are logged", () => {
    const mastery = createInitialMasteryState();
    [0, 2, 7].forEach((pitchClass) => {
      mastery.byPitchClass[String(pitchClass)].attempts = 1;
      mastery.byPitchClass[String(pitchClass)].score = 60;
    });

    const prompts = Array.from({ length: 40 }, (_, index) =>
      selectNextPrompt({
        mastery,
        currentLevel: 1,
        nowMs: 4000 + index,
        mode: "daily",
        seed: index + 1
      })
    ).filter((prompt) => prompt.type === "guided_string_note");

    expect(prompts.length).toBeGreaterThan(0);
    expect(new Set(prompts.map((prompt) => prompt.targetString))).toEqual(new Set(["B"]));
  });

  it("moves the guided-string focus after enough clean passes on the current string", () => {
    const attempts = [
      guidedAttemptFor(0, "B", 0, 900, 2000),
      guidedAttemptFor(7, "B", 7, 900, 3000)
    ];

    expect(getGuidedStringFocus({ attempts, availablePitchClasses: [0, 2, 7, 9, 4] })).toMatchObject({
      stringName: "B",
      cleanPasses: 2,
      targetCleanPasses: 3
    });

    attempts.push(guidedAttemptFor(2, "B", 2, 900, 4000));

    expect(getGuidedStringFocus({ attempts, availablePitchClasses: [0, 2, 7, 9, 4] })).toMatchObject({
      stringName: "G",
      cleanPasses: 0,
      targetCleanPasses: 3
    });
  });

  it("does not count wrong or slow guided-string attempts as clean focus passes", () => {
    const attempts = [
      guidedAttemptFor(0, "B", 5, 900, 2000),
      guidedAttemptFor(7, "B", 7, 3400, 3000),
      guidedAttemptFor(2, "B", 2, 900, 4000)
    ];

    expect(getGuidedStringFocus({ attempts, availablePitchClasses: [0, 2, 7, 9, 4] })).toMatchObject({
      stringName: "B",
      cleanPasses: 1
    });
  });

  it("explains the string lane once guided-string work is eligible", () => {
    const mastery = createInitialMasteryState();
    [0, 2, 7].forEach((pitchClass) => {
      mastery.byPitchClass[String(pitchClass)].attempts = 1;
      mastery.byPitchClass[String(pitchClass)].score = 60;
    });

    const rationale = getNextWorkoutRationale({
      attempts: [],
      currentLevel: 1,
      mastery,
      nowMs: 5000
    });

    expect(rationale.headline).toBe("String lane: B string");
    expect(rationale.detail).toContain("pitch-only");
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

  it("explains contrast work when the same miss repeats", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(7, 5),
      attemptFor(7, 5)
    ];

    const rationale = getNextWorkoutRationale({
      attempts,
      currentLevel: 1,
      mastery,
      nowMs: 5000
    });

    expect(rationale.headline).toBe("Contrast work: G vs F");
    expect(rationale.detail).toContain("Same miss repeated");
  });

  it("explains slow recall without treating it as wrong-note accuracy", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(2, 2, 3400),
      attemptFor(2, 2, 3500),
      attemptFor(2, 2, 3600)
    ];

    const rationale = getNextWorkoutRationale({
      attempts,
      currentLevel: 1,
      mastery,
      nowMs: 5000
    });

    expect(rationale.headline).toBe("Speed work: D");
    expect(rationale.detail).toContain("not automatically yet");
  });

  it("explains retention review after time away", () => {
    const mastery = createInitialMasteryState();
    const attempts = [
      attemptFor(0, 0),
      attemptFor(0, 0),
      attemptFor(0, 0)
    ];

    const rationale = getNextWorkoutRationale({
      attempts,
      currentLevel: 1,
      mastery,
      nowMs: 2000 + 24 * 60 * 60 * 1000
    });

    expect(rationale.headline).toBe("Retention review: C");
    expect(rationale.detail).toContain("due after time away");
  });
});
