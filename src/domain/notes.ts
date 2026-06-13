export type PitchClass = {
  value: number;
  displayName: string;
  aliases: string[];
};

export const PITCH_CLASSES: PitchClass[] = [
  { value: 0, displayName: "C", aliases: ["C"] },
  { value: 1, displayName: "C#/Db", aliases: ["C#", "Db"] },
  { value: 2, displayName: "D", aliases: ["D"] },
  { value: 3, displayName: "D#/Eb", aliases: ["D#", "Eb"] },
  { value: 4, displayName: "E", aliases: ["E"] },
  { value: 5, displayName: "F", aliases: ["F"] },
  { value: 6, displayName: "F#/Gb", aliases: ["F#", "Gb"] },
  { value: 7, displayName: "G", aliases: ["G"] },
  { value: 8, displayName: "G#/Ab", aliases: ["G#", "Ab"] },
  { value: 9, displayName: "A", aliases: ["A"] },
  { value: 10, displayName: "A#/Bb", aliases: ["A#", "Bb"] },
  { value: 11, displayName: "B", aliases: ["B"] }
];

const aliasToPitchClass = new Map<string, number>(
  PITCH_CLASSES.flatMap((pitchClass) =>
    pitchClass.aliases.map((alias) => [normalizeNoteName(alias), pitchClass.value] as const)
  )
);

export function normalizeNoteName(noteName: string): string {
  return noteName.trim().replace("♯", "#").replace("♭", "b").toUpperCase();
}

export function noteNameToPitchClass(noteName: string): number | null {
  return aliasToPitchClass.get(normalizeNoteName(noteName)) ?? null;
}

export function areEnharmonic(noteA: string, noteB: string): boolean {
  const pitchA = noteNameToPitchClass(noteA);
  const pitchB = noteNameToPitchClass(noteB);
  return pitchA !== null && pitchA === pitchB;
}

export function getDisplayName(pitchClass: number): string {
  return PITCH_CLASSES[modPitchClass(pitchClass)].displayName;
}

export function modPitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function getPreferredSpelling(pitchClass: number): string {
  return PITCH_CLASSES[modPitchClass(pitchClass)].aliases[0];
}
