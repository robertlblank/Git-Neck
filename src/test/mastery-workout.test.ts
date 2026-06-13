import { describe, expect, it } from "vitest";
import { createDrillPrompt } from "../domain/drills";
import { createInitialMasteryState, updateMastery } from "../domain/mastery";
import { scoreAttempt } from "../domain/scoring";
import { selectNextPrompt } from "../domain/workout";

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
});
