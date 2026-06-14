export type DrillMode = "daily" | "free" | "test";

export type GuitarString = "lowE" | "A" | "D" | "G" | "B" | "highE";

export type DrillType = "note" | "guided_string_note";

export type DrillPrompt = {
  id: string;
  type: DrillType;
  targetPitchClass: number;
  targetDisplayName: string;
  targetString?: GuitarString;
  requiresVerbalConfirmation: boolean;
  createdAtMs: number;
};

export type AttemptResult =
  | "pass"
  | "wrong_note"
  | "too_slow";

export type AttemptSource = "microphone" | "simulated";

export type SessionStructure = "one_15" | "three_5" | "five_3";

export type PracticeSessionStatus = "active" | "completed" | "interrupted";

export type Attempt = {
  id: string;
  promptId: string;
  mode: DrillMode;
  targetPitchClass: number;
  targetString?: GuitarString;
  submittedPitchClass: number | null;
  submittedDisplayName: string | null;
  wasCorrect: boolean;
  responseMs: number;
  verbalConfirmed: boolean;
  source: AttemptSource;
  result: AttemptResult;
  repeatedMistake: boolean;
  cleanStreakCount: number;
  cleanStreakPassed: boolean;
  createdAtMs: number;
};

export type Settings = {
  workoutLengthMinutes: number;
  minFret: number;
  maxFret: number;
  tigerMode: boolean;
  revealFretboardDefault: boolean;
  activeInputMode: "microphone";
  sessionStructure: SessionStructure;
  forceUnlockedLevel: number | null;
};

export type PitchMastery = {
  pitchClass: number;
  attempts: number;
  correct: number;
  wrong: number;
  slow: number;
  cleanStreak: number;
  bestCleanStreak: number;
  score: number;
  totalResponseMs: number;
  lastAttemptAtMs: number | null;
  lastWrongSubmittedPitchClass: number | null;
};

export type MasteryState = {
  byPitchClass: Record<string, PitchMastery>;
};

export type PracticeSession = {
  id: string;
  mode: DrillMode;
  structure: SessionStructure;
  status: PracticeSessionStatus;
  segmentCount: number;
  segmentDurationMinutes: number;
  startedAtMs: number;
  endedAtMs: number | null;
  activePracticeMs: number;
  completedSegments: number;
  attemptIds: string[];
};

export type AppState = {
  version: 3;
  settings: Settings;
  mastery: MasteryState;
  attempts: Attempt[];
  currentLevel: number;
  sessions: PracticeSession[];
};

export type ScoringInput = {
  prompt: DrillPrompt;
  mode: DrillMode;
  submittedPitchClass: number | null;
  submittedDisplayName: string | null;
  source: AttemptSource;
  verbalConfirmed?: boolean;
  responseMs: number;
  previousAttempts: Attempt[];
  nowMs: number;
};

export type ScoringOutcome = {
  attempt: Attempt;
  targetMs: number;
};
