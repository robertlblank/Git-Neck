import { describe, expect, it } from "vitest";
import { getCompletedSegments, getCurrentSegment, getSessionSegmentRemainingMs } from "../domain/sessions";

describe("practice sessions", () => {
  it("tracks completed segments for three five-minute blocks", () => {
    expect(getCompletedSegments(6 * 60_000, "three_5")).toBe(1);
    expect(getCurrentSegment(6 * 60_000, "three_5")).toBe(2);
  });

  it("caps completed segments at configured count", () => {
    expect(getCompletedSegments(20 * 60_000, "five_3")).toBe(5);
  });

  it("reports remaining time in the current segment", () => {
    expect(getSessionSegmentRemainingMs(2 * 60_000, "five_3")).toBe(60_000);
  });
});
