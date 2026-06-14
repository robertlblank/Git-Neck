import { createInitialMasteryState } from "../domain/mastery";
import type { AppState, PracticeSession, Settings } from "../domain/types";

export const DEFAULT_SETTINGS: Settings = {
  workoutLengthMinutes: 15,
  minFret: 0,
  maxFret: 12,
  tigerMode: true,
  revealFretboardDefault: false,
  activeInputMode: "microphone",
  sessionStructure: "one_15",
  forceUnlockedLevel: null
};

export function createDefaultAppState(): AppState {
  return {
    version: 3,
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
  const versionedPartial = partial as { version?: number };
  const incomingVersion = typeof versionedPartial.version === "number" ? versionedPartial.version : 1;
  const incomingSettings: Partial<Settings> = partial.settings ?? {};
  const tigerMode =
    incomingVersion === 1 && incomingSettings.tigerMode === false
      ? true
      : incomingSettings.tigerMode ?? defaults.settings.tigerMode;

  return {
    version: 3,
    settings: {
      ...defaults.settings,
      ...incomingSettings,
      tigerMode,
      activeInputMode: "microphone"
    },
    mastery: partial.mastery ?? defaults.mastery,
    attempts: partial.attempts ?? [],
    currentLevel: partial.currentLevel ?? defaults.currentLevel,
    sessions: normalizeSessions(partial.sessions)
  };
}

function normalizeSessions(sessions: AppState["sessions"] | undefined): PracticeSession[] {
  return (sessions ?? []).map((session) => ({
    ...session,
    status: session.status ?? (session.endedAtMs === null ? "interrupted" : "completed")
  }));
}
