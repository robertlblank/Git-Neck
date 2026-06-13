import { describe, expect, it } from "vitest";
import { findPosition, generateFretboard, STANDARD_TUNING } from "../domain/fretboard";

describe("fretboard", () => {
  it("uses standard tuning open strings", () => {
    expect(STANDARD_TUNING.map((entry) => entry.string)).toEqual(["lowE", "A", "D", "G", "B", "highE"]);
    expect(STANDARD_TUNING.map((entry) => entry.openPitchClass)).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it("open-12 contains the octave repeat", () => {
    const fretboard = generateFretboard(0, 12);
    expect(findPosition(fretboard, "lowE", 0)?.pitchClass).toBe(findPosition(fretboard, "lowE", 12)?.pitchClass);
  });

  it("contains known positions", () => {
    const fretboard = generateFretboard(0, 12);
    expect(findPosition(fretboard, "lowE", 0)?.displayName).toBe("E");
    expect(findPosition(fretboard, "lowE", 1)?.displayName).toBe("F");
    expect(findPosition(fretboard, "A", 3)?.displayName).toBe("C");
    expect(findPosition(fretboard, "D", 4)?.displayName).toBe("F#/Gb");
    expect(findPosition(fretboard, "B", 1)?.displayName).toBe("C");
  });
});
