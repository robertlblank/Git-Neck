import { describe, expect, it } from "vitest";
import {
  TREY_CURRICULUM_WEEKS,
  TREY_SOURCE_REFERENCES,
  TREY_TONE_NOTES,
  TREY_VOCABULARY,
  getTreySourceReferences,
  transposeTreyPattern
} from "../domain/treyCurriculum";

describe("Trey curriculum", () => {
  it("keeps every vocabulary pattern aligned with display labels", () => {
    TREY_VOCABULARY.forEach((card) => {
      expect(card.intervalPattern.length).toBe(card.patternLabels.length);
      expect(card.intervalPattern.length).toBeGreaterThan(0);
    });
  });

  it("transposes semitone patterns into display note names", () => {
    expect(transposeTreyPattern(7, [0, 2, 4, 5])).toEqual(["G", "A", "B", "C"]);
    expect(transposeTreyPattern(11, [0, 1, 3])).toEqual(["B", "C", "D"]);
  });

  it("resolves all referenced source ids", () => {
    const sourceIds = new Set(TREY_SOURCE_REFERENCES.map((source) => source.id));
    const referencedIds = [
      ...TREY_VOCABULARY.flatMap((card) => card.sourceIds),
      ...TREY_CURRICULUM_WEEKS.flatMap((week) => week.sourceIds),
      ...TREY_TONE_NOTES.flatMap((note) => note.sourceIds)
    ];

    referencedIds.forEach((sourceId) => expect(sourceIds.has(sourceId)).toBe(true));
  });

  it("builds a six-week curriculum with practice and pass criteria", () => {
    expect(TREY_CURRICULUM_WEEKS).toHaveLength(6);
    TREY_CURRICULUM_WEEKS.forEach((week, index) => {
      expect(week.week).toBe(index + 1);
      expect(week.dailyBlocks.length).toBeGreaterThanOrEqual(3);
      expect(week.passCriteria.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("returns source references in canonical source order", () => {
    const sourceReferences = getTreySourceReferences(["phishnet-stash", "guitarworld-improv"]);

    expect(sourceReferences.map((source) => source.id)).toEqual(["guitarworld-improv", "phishnet-stash"]);
  });
});
