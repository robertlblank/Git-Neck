import { getPreferredSpelling } from "./notes";
import type { Attempt, DrillPrompt } from "./types";

export function getCoachingFeedback(attempt: Attempt, prompt: DrillPrompt): string {
  if (attempt.repeatedMistake) {
    return "Same miss again. Slow down and find it deliberately.";
  }

  if (attempt.cleanStreakPassed) {
    return "Clean streak hit. Moving on.";
  }

  if (attempt.result === "pass") {
    return "Good. Again.";
  }

  if (attempt.result === "too_slow") {
    return "Correct, but too slow. You had to search. Again.";
  }

  if (attempt.submittedDisplayName) {
    return `Wrong. You played ${attempt.submittedDisplayName}. Target was ${prompt.targetDisplayName}.${miniTheory(prompt.targetPitchClass)}`;
  }

  return `Wrong. Target was ${prompt.targetDisplayName}.`;
}

function miniTheory(targetPitchClass: number): string {
  const spelling = getPreferredSpelling(targetPitchClass);

  if (spelling.includes("#")) {
    return ` ${spelling} is one fret higher than ${spelling.replace("#", "")}.`;
  }

  return "";
}
