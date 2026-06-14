import { describe, expect, it } from "vitest";
import {
  classifyFrequencyForTarget,
  describeFrequency,
  estimatePitchFromTimeDomain,
  excludeIdleSilenceFromTimer,
  frequencyToPitchClass,
  shouldScoreStablePitch,
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

  it("does not score a pitch before it has been stable long enough", () => {
    expect(
      shouldScoreStablePitch({
        stableFrames: 20,
        stablePitchStartedAtMs: 1000,
        nowMs: 1190
      })
    ).toBe(false);
  });

  it("does not score a pitch with too few stable frames", () => {
    expect(
      shouldScoreStablePitch({
        stableFrames: 5,
        stablePitchStartedAtMs: 1000,
        nowMs: 2000
      })
    ).toBe(false);
  });

  it("scores only after enough frames and stable time", () => {
    expect(
      shouldScoreStablePitch({
        stableFrames: 12,
        stablePitchStartedAtMs: 1000,
        nowMs: 1450
      })
    ).toBe(true);
  });

  it("estimates the fundamental of a guitar-like E waveform", () => {
    const detection = estimatePitchFromTimeDomain(makeGuitarLikeWaveform(82.41), 44100);

    expect(detection?.displayName).toBe("E");
  });

  it("estimates the fundamental of a guitar-like C waveform with harmonics", () => {
    const detection = estimatePitchFromTimeDomain(makeGuitarLikeWaveform(261.63), 44100);

    expect(detection?.displayName).toBe("C");
  });
});

function makeGuitarLikeWaveform(frequencyHz: number, sampleRate = 44100, length = 4096): Float32Array {
  return Float32Array.from({ length }, (_, index) => {
    const t = index / sampleRate;
    return (
      0.7 * Math.sin(2 * Math.PI * frequencyHz * t) +
      0.25 * Math.sin(2 * Math.PI * frequencyHz * 2 * t) +
      0.12 * Math.sin(2 * Math.PI * frequencyHz * 3 * t)
    );
  });
}
