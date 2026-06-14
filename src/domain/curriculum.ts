export type CurriculumLevel = {
  level: number;
  name: string;
  pitchClasses: number[];
  focusGroups: number[][];
  drillTypes: Array<"note" | "guided_string_note">;
};

export const CURRICULUM_LEVELS: CurriculumLevel[] = [
  {
    level: 1,
    name: "Natural notes, open-12",
    pitchClasses: [0, 2, 4, 5, 7, 9, 11],
    focusGroups: [
      [0, 7, 2],
      [9, 4],
      [5, 11]
    ],
    drillTypes: ["note"]
  },
  {
    level: 2,
    name: "Sharps/flats, open-12",
    pitchClasses: [1, 3, 6, 8, 10],
    focusGroups: [
      [6, 1],
      [8, 3],
      [10]
    ],
    drillTypes: ["note"]
  },
  {
    level: 3,
    name: "Guided-string recall",
    pitchClasses: [0, 2, 4, 5, 7, 9, 11],
    focusGroups: [
      [0, 7, 2],
      [9, 4],
      [5, 11]
    ],
    drillTypes: ["guided_string_note"]
  },
  {
    level: 4,
    name: "Full chromatic recall",
    pitchClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    focusGroups: [
      [0, 7, 2],
      [9, 4],
      [5, 11],
      [6, 1],
      [8, 3],
      [10]
    ],
    drillTypes: ["note", "guided_string_note"]
  },
  {
    level: 5,
    name: "Speed/pressure mastery",
    pitchClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    focusGroups: [
      [0, 7, 2, 9],
      [4, 5, 11],
      [6, 1, 8, 3, 10]
    ],
    drillTypes: ["note", "guided_string_note"]
  }
];

export function getCurrentLevel(level: number): CurriculumLevel {
  return CURRICULUM_LEVELS.find((entry) => entry.level === level) ?? CURRICULUM_LEVELS[0];
}

export function canAutoUnlockNextLevel(currentLevel: number, averageScore: number): boolean {
  return currentLevel < CURRICULUM_LEVELS.length && averageScore >= 70;
}

export const FORCE_UNLOCK_WARNING =
  "You can move on, but this is not automatic yet. Weak notes will keep coming back.";
