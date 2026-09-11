export type QuestKind = "main" | "subquest";
export type EvidenceType = "note" | "url" | "file" | "metric";
export type XpSource = "quest_completion" | "daily_mission" | "habit" | "milestone" | "bonus";

export interface Quest {
  id: string;
  userId: string;
  parentQuestId: string | null;
  title: string;
  kind: QuestKind;
  dueDate: string | null;
  createdAt: string;
}

export interface QuestStep {
  id: string;
  questId: string;
  title: string;
  position: number;
  completedAt: string | null;
  evidenceType: EvidenceType | null;
  evidenceValue: string | null;
}
