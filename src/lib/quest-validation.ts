import type { EvidenceType, QuestKind } from "@/types/domain";

const titleMaxLength = 160;
const evidenceMaxLength = 4_000;

export function cleanQuestTitle(value: FormDataEntryValue | null): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title || title.length > titleMaxLength) throw new Error(`Quest titles must be 1–${titleMaxLength} characters.`);
  return title;
}

export function questKind(value: FormDataEntryValue | null): QuestKind {
  if (value === "main" || value === "subquest") return value;
  throw new Error("Choose a valid quest type.");
}

export function completionEvidence(type: FormDataEntryValue | null, value: FormDataEntryValue | null): { type: EvidenceType; value: string } {
  if (type !== "note" && type !== "url" && type !== "file" && type !== "metric") throw new Error("Choose a valid evidence type.");
  const cleanedValue = typeof value === "string" ? value.trim() : "";
  if (!cleanedValue || cleanedValue.length > evidenceMaxLength) throw new Error("Evidence must be between 1 and 4,000 characters.");
  return { type, value: cleanedValue };
}
