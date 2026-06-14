import { describe, expect, it } from "vitest";
import { createDrillPrompt } from "../domain/drills";
import { scoreAttempt } from "../domain/scoring";
import {
  assessConfusionPairSkill,
  assessPitchClassSkill,
  assessStringPitchSkill,
  createPitchClassSkillId,
  createStringPitchSkillId
} from "../domain/training";
import type { Attempt, DrillPrompt, GuitarString } from "../domain/types";

function makeAttempt(params: {
  createdAtMs: number;
  responseMs?: number;
  stringName?: GuitarString;
  submittedPitchClass: number;
  targetPitchClass: number;
}): Attempt {
  const prompt: DrillPrompt = createDrillPrompt({
    id: `prompt-${params.createdAtMs}`,
    type: params.stringName ? "guided_string_note" : "note",
    targetPitchClass: params.targetPitchClass,
    targetString: params.stringName,
    nowMs: params.createdAtMs - 1000
  });

  return scoreAttempt({
    prompt,
    mode: "daily",
    submittedPitchClass: params.submittedPitchClass,
    submittedDisplayName: null,
    source: "microphone",
    responseMs: params.responseMs ?? 900,
    previousAttempts: [],
    nowMs: params.createdAtMs
  }).attempt;
}

describe("training model", () => {
  it("creates stable skill ids", () => {
    expect(createPitchClassSkillId(0)).toBe("pitch_class:0");
    expect(createStringPitchSkillId("B", 0)).toBe("string_pitch:B:0");
  });

  it("marks an unattempted pitch class as unseen and active", () => {
    const assessment = assessPitchClassSkill({ attempts: [], nowMs: 10_000, pitchClass: 0 });

    expect(assessment.state).toBe("unseen");
    expect(assessment.prescription).toBe("active");
  });

  it("diagnoses weak accuracy from repeated misses", () => {
    const attempts = [
      makeAttempt({ createdAtMs: 1_000, targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 2_000, targetPitchClass: 0, submittedPitchClass: 5 }),
      makeAttempt({ createdAtMs: 3_000, targetPitchClass: 0, submittedPitchClass: 7 })
    ];

    const assessment = assessPitchClassSkill({ attempts, nowMs: 4_000, pitchClass: 0 });

    expect(assessment.state).toBe("weak_accuracy");
    expect(assessment.prescription).toBe("active");
  });

  it("diagnoses slow recall separately from accuracy", () => {
    const attempts = [
      makeAttempt({ createdAtMs: 1_000, responseMs: 3_400, targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 2_000, responseMs: 3_500, targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 3_000, responseMs: 3_600, targetPitchClass: 0, submittedPitchClass: 0 })
    ];

    const assessment = assessPitchClassSkill({ attempts, nowMs: 4_000, pitchClass: 0 });

    expect(assessment.state).toBe("slow_recall");
  });

  it("diagnoses automatic recall from enough fast clean passes", () => {
    const attempts = [1_000, 2_000, 3_000, 4_000, 5_000].map((createdAtMs) =>
      makeAttempt({ createdAtMs, responseMs: 900, targetPitchClass: 0, submittedPitchClass: 0 })
    );
    const attemptsWithStreaks = attempts.map((attempt, index) => ({ ...attempt, cleanStreakCount: index + 1 }));

    const assessment = assessPitchClassSkill({ attempts: attemptsWithStreaks, nowMs: 6_000, pitchClass: 0 });

    expect(assessment.state).toBe("automatic");
    expect(assessment.prescription).toBe("expand");
  });

  it("diagnoses repeated confusion and prescribes contrast practice", () => {
    const attempts = [
      makeAttempt({ createdAtMs: 1_000, targetPitchClass: 6, submittedPitchClass: 5 }),
      makeAttempt({ createdAtMs: 2_000, targetPitchClass: 6, submittedPitchClass: 5 })
    ];

    const assessment = assessConfusionPairSkill({
      attempts,
      targetPitchClass: 6,
      confusedWithPitchClass: 5
    });

    expect(assessment.state).toBe("repeated_confusion");
    expect(assessment.prescription).toBe("contrast");
    expect(assessment.label).toBe("F#/Gb vs F");
  });

  it("diagnoses retention due after a long delay", () => {
    const attempts = [
      makeAttempt({ createdAtMs: 1_000, responseMs: 900, targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 2_000, responseMs: 900, targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 3_000, responseMs: 900, targetPitchClass: 0, submittedPitchClass: 0 })
    ];

    const assessment = assessPitchClassSkill({
      attempts,
      nowMs: 3_000 + 24 * 60 * 60 * 1000,
      pitchClass: 0
    });

    expect(assessment.state).toBe("retention_failed");
    expect(assessment.prescription).toBe("review");
  });

  it("assesses string-specific recall separately from global pitch recall", () => {
    const attempts = [
      makeAttempt({ createdAtMs: 1_000, stringName: "B", targetPitchClass: 0, submittedPitchClass: 0 }),
      makeAttempt({ createdAtMs: 2_000, stringName: "A", targetPitchClass: 0, submittedPitchClass: 5 })
    ];

    const bString = assessStringPitchSkill({
      attempts,
      nowMs: 3_000,
      pitchClass: 0,
      stringName: "B"
    });

    expect(bString.id).toBe("string_pitch:B:0");
    expect(bString.attempts).toBe(1);
    expect(bString.label).toBe("C on B");
  });
});
