import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "../persistence/schema";
import { InMemoryGitNeckRepository } from "../persistence/repository";

describe("persistence repository", () => {
  it("saves and loads settings", async () => {
    const state = createDefaultAppState();
    const repository = new InMemoryGitNeckRepository(state);

    state.settings.workoutLengthMinutes = 20;
    await repository.save(state);

    const loaded = await repository.load();
    expect(loaded.settings.workoutLengthMinutes).toBe(20);
  });

  it("saves and loads mastery", async () => {
    const state = createDefaultAppState();
    const repository = new InMemoryGitNeckRepository(state);

    state.mastery.byPitchClass["0"].score = 77;
    await repository.save(state);

    const loaded = await repository.load();
    expect(loaded.mastery.byPitchClass["0"].score).toBe(77);
  });

  it("saves and loads attempts", async () => {
    const state = createDefaultAppState();
    const repository = new InMemoryGitNeckRepository(state);

    state.attempts.push({
      id: "attempt-1",
      promptId: "prompt-1",
      mode: "free",
      targetPitchClass: 0,
      submittedPitchClass: 0,
      submittedDisplayName: "C",
      wasCorrect: true,
      responseMs: 800,
      verbalConfirmed: true,
      source: "microphone",
      result: "pass",
      repeatedMistake: false,
      cleanStreakCount: 1,
      cleanStreakPassed: false,
      createdAtMs: 1000
    });
    await repository.save(state);

    const loaded = await repository.load();
    expect(loaded.attempts).toHaveLength(1);
  });
});
