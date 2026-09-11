export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: { id: string; display_name: string | null; created_at: string; updated_at: string }; Insert: { id: string; display_name?: string | null }; Update: { display_name?: string | null }; Relationships: [] };
      quests: { Row: { id: string; user_id: string; parent_quest_id: string | null; title: string; kind: "main" | "subquest"; due_date: string | null; created_at: string; updated_at: string }; Insert: { user_id?: string; parent_quest_id?: string | null; title: string; kind?: "main" | "subquest"; due_date?: string | null }; Update: { title?: string; due_date?: string | null }; Relationships: [] };
      quest_steps: { Row: { id: string; quest_id: string; title: string; position: number; completed_at: string | null; evidence_type: "note" | "url" | "file" | "metric" | null; evidence_value: string | null; created_at: string; updated_at: string }; Insert: { quest_id: string; title: string; position: number; completed_at?: string | null; evidence_type?: "note" | "url" | "file" | "metric" | null; evidence_value?: string | null }; Update: { title?: string; position?: number; completed_at?: string | null; evidence_type?: "note" | "url" | "file" | "metric" | null; evidence_value?: string | null }; Relationships: [] };
      xp_ledger: { Row: { id: string; user_id: string; source: "quest_completion" | "daily_mission" | "habit" | "milestone" | "bonus"; source_id: string; amount: number; awarded_at: string; note: string | null }; Insert: { user_id?: string; source: "quest_completion" | "daily_mission" | "habit" | "milestone" | "bonus"; source_id: string; amount: number; note?: string | null }; Update: never; Relationships: [] };
    };
    Views: {
      quest_progress: { Row: { id: string; user_id: string; parent_quest_id: string | null; title: string; kind: "main" | "subquest"; due_date: string | null; created_at: string; updated_at: string; progress_percent: number; status: "not_started" | "in_progress" | "done" }; Relationships: [] };
    };
    Functions: {
      complete_quest_step: { Args: { p_step_id: string; p_evidence_type: "note" | "url" | "file" | "metric"; p_evidence_value: string }; Returns: { step_id: string; completed_at: string; xp_awarded: boolean }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
