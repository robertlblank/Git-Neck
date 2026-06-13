import { describe, expect, it } from "vitest";
import { areEnharmonic, getDisplayName, noteNameToPitchClass } from "../domain/notes";

describe("notes", () => {
  it("maps C to pitch class 0", () => {
    expect(noteNameToPitchClass("C")).toBe(0);
  });

  it("maps C# and Db to the same pitch class", () => {
    expect(noteNameToPitchClass("C#")).toBe(noteNameToPitchClass("Db"));
    expect(areEnharmonic("C#", "Db")).toBe(true);
  });

  it("keeps display names stable", () => {
    expect(getDisplayName(0)).toBe("C");
    expect(getDisplayName(1)).toBe("C#/Db");
    expect(getDisplayName(10)).toBe("A#/Bb");
  });
});
