import { describe, expect, it } from "vitest";
import { createDrillPrompt } from "../domain/drills";
import { scoreAttempt } from "../domain/scoring";
import type { Attempt } from "../domain/types";

const prompt = createDrillPrompt({
  id: "prompt-1",
  type: "note",
  targetPitchClass: 1,
  nowMs: 1000
});

function score(overrides: Partial<Parameters<typeof scoreAttempt>[0]> = {}) {
  return scoreAttempt({
    prompt,
    mode: "daily",
    submittedPitchClass: 1,
    submittedDisplayName: "C#/Db",
    source: "microphone",
    responseMs: 900,
    previousAttempts: [],
    nowMs: 2000,
    ...overrides
  }).attempt;
}

describe("scoring", () => {
  it("passes a correct note", () => {
    expect(score().result).toBe("pass");
  });

  it("fails a wrong note", () => {
    const attempt = score({ submittedPitchClass: 5, submittedDisplayName: "F" });
    expect(attempt.result).toBe("wrong_note");
    expect(attempt.wasCorrect).toBe(false);
  });

  it("passes enharmonic equivalents by pitch class", () => {
    const attempt = score({ submittedPitchClass: 1, submittedDisplayName: "Db" });
    expect(attempt.result).toBe("pass");
  });

  it("does not require verbal confirmation", () => {
    const attempt = score({ verbalConfirmed: false });
    expect(attempt.result).toBe("pass");
  });

  it("marks correct but slow as not mastered", () => {
    const attempt = score({ responseMs: 3500 });
    expect(attempt.result).toBe("too_slow");
    expect(attempt.wasCorrect).toBe(true);
    expect(attempt.cleanStreakCount).toBe(0);
  });

  it("flags repeated same wrong note", () => {
    const previous = score({ submittedPitchClass: 5, submittedDisplayName: "F" });
    const repeated = score({
      submittedPitchClass: 5,
      submittedDisplayName: "F",
      previousAttempts: [previous]
    });
    expect(repeated.repeatedMistake).toBe(true);
  });

  it("triggers clean streak pass", () => {
    const previousAttempts: Attempt[] = Array.from({ length: 4 }, (_, index) =>
      score({ nowMs: 2000 + index, previousAttempts: [] })
    );
    const attempt = score({ previousAttempts });
    expect(attempt.cleanStreakCount).toBe(5);
    expect(attempt.cleanStreakPassed).toBe(true);
  });

  it("distinguishes pressure attempts from daily attempts", () => {
    const attempt = score({ mode: "test", responseMs: 1900 });
    expect(attempt.mode).toBe("test");
    expect(attempt.result).toBe("too_slow");
  });
});
