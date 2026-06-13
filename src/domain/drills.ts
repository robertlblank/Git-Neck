import { getDisplayName, modPitchClass } from "./notes";
import type { DrillPrompt, DrillType, GuitarString } from "./types";

export function createDrillPrompt(params: {
  id: string;
  type: DrillType;
  targetPitchClass: number;
  targetString?: GuitarString;
  nowMs: number;
}): DrillPrompt {
  return {
    id: params.id,
    type: params.type,
    targetPitchClass: modPitchClass(params.targetPitchClass),
    targetDisplayName: getDisplayName(params.targetPitchClass),
    targetString: params.targetString,
    requiresVerbalConfirmation: false,
    createdAtMs: params.nowMs
  };
}

export function renderPrompt(prompt: DrillPrompt): string {
  if (prompt.type === "guided_string_note" && prompt.targetString) {
    return `Play ${prompt.targetDisplayName} on the ${formatStringName(prompt.targetString)} string.`;
  }

  return `Play ${prompt.targetDisplayName}.`;
}

export function formatStringName(stringName: GuitarString): string {
  return stringName === "lowE" ? "low E" : stringName === "highE" ? "high E" : stringName;
}
