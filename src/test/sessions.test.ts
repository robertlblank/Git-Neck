import { describe, expect, it } from "vitest";
import {
  appendAttemptToActiveSession,
  completeActiveSession,
  getCompletedSegments,
  getCurrentSegment,
  getSessionSegmentRemainingMs,
  recoverInterruptedSessions
} from "../domain/sessions";

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

  it("creates and appends attempts to an active session", () => {
    const sessions = appendAttemptToActiveSession({
      sessions: [],
      sessionId: "session-1",
      mode: "daily",
      structure: "one_15",
      startedAtMs: 1000,
      activePracticeMs: 1200,
      attemptId: "attempt-1"
    });

    const updated = appendAttemptToActiveSession({
      sessions,
      sessionId: "session-1",
      mode: "daily",
      structure: "one_15",
      startedAtMs: 1000,
      activePracticeMs: 2400,
      attemptId: "attempt-2"
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].status).toBe("active");
    expect(updated[0].attemptIds).toEqual(["attempt-1", "attempt-2"]);
    expect(updated[0].activePracticeMs).toBe(2400);
  });

  it("marks active sessions completed without creating a second session", () => {
    const sessions = appendAttemptToActiveSession({
      sessions: [],
      sessionId: "session-1",
      mode: "daily",
      structure: "one_15",
      startedAtMs: 1000,
      activePracticeMs: 1200,
      attemptId: "attempt-1"
    });

    const completed = completeActiveSession({
      sessions,
      sessionId: "session-1",
      endedAtMs: 3000,
      activePracticeMs: 2000
    });

    expect(completed).toHaveLength(1);
    expect(completed[0].status).toBe("completed");
    expect(completed[0].endedAtMs).toBe(3000);
  });

  it("recovers unfinished active sessions as interrupted on next launch", () => {
    const sessions = appendAttemptToActiveSession({
      sessions: [],
      sessionId: "session-1",
      mode: "daily",
      structure: "one_15",
      startedAtMs: 1000,
      activePracticeMs: 1200,
      attemptId: "attempt-1"
    });

    const recovered = recoverInterruptedSessions(sessions, 5000);

    expect(recovered).toHaveLength(1);
    expect(recovered[0].status).toBe("interrupted");
    expect(recovered[0].endedAtMs).toBe(5000);
  });

  it("drops empty active sessions during recovery", () => {
    const recovered = recoverInterruptedSessions(
      [
        {
          id: "session-empty",
          mode: "daily",
          structure: "one_15",
          status: "active",
          segmentCount: 1,
          segmentDurationMinutes: 15,
          startedAtMs: 1000,
          endedAtMs: null,
          activePracticeMs: 0,
          completedSegments: 0,
          attemptIds: []
        }
      ],
      5000
    );

    expect(recovered).toHaveLength(0);
  });
});
