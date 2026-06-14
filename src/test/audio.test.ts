import { describe, expect, it } from "vitest";
import {
  classifyFrequencyForTarget,
  describeFrequency,
  excludeIdleSilenceFromTimer,
  frequencyToPitchClass,
  updateSessionTuningOffset
} from "../domain/audio";

describe("audio pitch helpers", () => {
  it("maps A4 to pitch class A", () => {
    expect(frequencyToPitchClass(440)).toBe(9);
  });

  it("maps middle C close to pitch class C", () => {
    expect(frequencyToPitchClass(261.63)).toBe(0);
  });

  it("describes a detected guitar E as E", () => {
    expect(describeFrequency(82.41).displayName).toBe("E");
  });

  it("accepts a target note that is sharp within session tolerance", () => {
    const classification = classifyFrequencyForTarget({
      frequencyHz: 261.63 * 2 ** (60 / 1200),
      targetPitchClass: 0,
      tuningOffsetCents: 0
    });

    expect(classification.acceptedAsTarget).toBe(true);
    expect(classification.pitchClass).toBe(0);
    expect(classification.observedTuningOffsetCents).toBe(60);
  });

  it("uses learned session offset for later notes", () => {
    const classification = classifyFrequencyForTarget({
      frequencyHz: 293.66 * 2 ** (60 / 1200),
      targetPitchClass: 2,
      tuningOffsetCents: 60
    });

    expect(classification.acceptedAsTarget).toBe(true);
    expect(classification.centsFromTarget).toBe(0);
  });

  it("does not accept a clearly wrong nearby pitch class", () => {
    const classification = classifyFrequencyForTarget({
      frequencyHz: 293.66,
      targetPitchClass: 0,
      tuningOffsetCents: 0
    });

    expect(classification.acceptedAsTarget).toBe(false);
    expect(classification.pitchClass).toBe(2);
  });

  it("learns session tuning conservatively over multiple notes", () => {
    let update = updateSessionTuningOffset({
      currentOffsetCents: 0,
      sampleCount: 0,
      observedOffsetCents: 32
    });

    expect(update.tuningOffsetCents).toBe(8);
    expect(update.sampleCount).toBe(1);

    update = updateSessionTuningOffset({
      currentOffsetCents: update.tuningOffsetCents,
      sampleCount: update.sampleCount,
      observedOffsetCents: 32
    });

    expect(update.tuningOffsetCents).toBe(14);
  });

  it("ignores extreme offset observations that may be bends or wrong notes", () => {
    const update = updateSessionTuningOffset({
      currentOffsetCents: 10,
      sampleCount: 3,
      observedOffsetCents: 80
    });

    expect(update.tuningOffsetCents).toBe(10);
    expect(update.sampleCount).toBe(3);
    expect(update.acceptedObservation).toBe(false);
  });

  it("does not exclude short silence from response timing", () => {
    const timer = excludeIdleSilenceFromTimer({
      scoringStartedAtMs: 1000,
      silenceStartedAtMs: 1000,
      resumedAtMs: 3500,
      idleGraceMs: 5000
    });

    expect(timer.scoringStartedAtMs).toBe(1000);
    expect(timer.excludedIdleMs).toBe(0);
  });

  it("excludes long idle silence from response timing", () => {
    const timer = excludeIdleSilenceFromTimer({
      scoringStartedAtMs: 1000,
      silenceStartedAtMs: 1000,
      resumedAtMs: 21000,
      idleGraceMs: 5000
    });

    expect(timer.scoringStartedAtMs).toBe(21000);
    expect(timer.excludedIdleMs).toBe(20000);
  });
});
