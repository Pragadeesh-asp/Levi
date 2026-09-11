import { describe, expect, it } from "vitest";
import { cleanQuestTitle, completionEvidence, questKind } from "./quest-validation";

describe("quest input validation", () => {
  it("normalizes valid quest titles", () => expect(cleanQuestTitle("  Master React  ")).toBe("Master React"));
  it("rejects empty or invalid quest input", () => {
    expect(() => cleanQuestTitle(" ")).toThrow("Quest titles");
    expect(() => questKind("sidequest")).toThrow("valid quest type");
  });
  it("requires typed, meaningful completion evidence", () => {
    expect(completionEvidence("url", " https://example.com ")).toEqual({ type: "url", value: "https://example.com" });
    expect(() => completionEvidence("url", "")).toThrow("Evidence");
  });
});
