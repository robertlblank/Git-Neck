import { createInitialMasteryState } from "../domain/mastery";
import type { AppState, Settings } from "../domain/types";

export const DEFAULT_SETTINGS: Settings = {
  workoutLengthMinutes: 15,
  minFret: 0,
  maxFret: 12,
  tigerMode: false,
  revealFretboardDefault: false,
  activeInputMode: "microphone",
  sessionStructure: "one_15",
  forceUnlockedLevel: null
};

export function createDefaultAppState(): AppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    mastery: createInitialMasteryState(),
    attempts: [],
    currentLevel: 1,
    sessions: []
  };
}

export function normalizeAppState(value: unknown): AppState {
  if (!value || typeof value !== "object") {
    return createDefaultAppState();
  }

  const partial = value as Partial<AppState>;
  const defaults = createDefaultAppState();

  return {
    version: 1,
    settings: {
      ...defaults.settings,
      ...(partial.settings ?? {}),
      activeInputMode: "microphone"
    },
    mastery: partial.mastery ?? defaults.mastery,
    attempts: partial.attempts ?? [],
    currentLevel: partial.currentLevel ?? defaults.currentLevel,
    sessions: partial.sessions ?? []
  };
}
