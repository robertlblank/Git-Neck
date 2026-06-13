import { getDisplayName, modPitchClass } from "./notes";
import type { GuitarString } from "./types";

export type FretboardPosition = {
  string: GuitarString;
  fret: number;
  pitchClass: number;
  displayName: string;
};

export const STANDARD_TUNING: Array<{ string: GuitarString; openPitchClass: number }> = [
  { string: "lowE", openPitchClass: 4 },
  { string: "A", openPitchClass: 9 },
  { string: "D", openPitchClass: 2 },
  { string: "G", openPitchClass: 7 },
  { string: "B", openPitchClass: 11 },
  { string: "highE", openPitchClass: 4 }
];

export function generateFretboard(minFret = 0, maxFret = 12): FretboardPosition[] {
  const positions: FretboardPosition[] = [];

  for (const tuning of STANDARD_TUNING) {
    for (let fret = minFret; fret <= maxFret; fret += 1) {
      const pitchClass = modPitchClass(tuning.openPitchClass + fret);
      positions.push({
        string: tuning.string,
        fret,
        pitchClass,
        displayName: getDisplayName(pitchClass)
      });
    }
  }

  return positions;
}

export function findPosition(
  positions: FretboardPosition[],
  string: GuitarString,
  fret: number
): FretboardPosition | null {
  return positions.find((position) => position.string === string && position.fret === fret) ?? null;
}
