"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cleanQuestTitle, completionEvidence, questKind } from "@/lib/quest-validation";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to manage quests.");
  return { supabase, user };
}

export async function createQuest(formData: FormData) {
  const { supabase, user } = await requireUser();
  const kind = questKind(formData.get("kind"));
  const parentQuestId = typeof formData.get("parentQuestId") === "string" ? String(formData.get("parentQuestId")) : "";
  if ((kind === "main" && parentQuestId) || (kind === "subquest" && !parentQuestId)) throw new Error("A subquest requires a main quest parent.");
  const dueDateValue = formData.get("dueDate");
  const { error } = await supabase.from("quests").insert({ user_id: user.id, title: cleanQuestTitle(formData.get("title")), kind, parent_quest_id: parentQuestId || null, due_date: typeof dueDateValue === "string" && dueDateValue ? dueDateValue : null });
  if (error) throw new Error(error.message);
  revalidatePath("/quests");
}

export async function updateQuest(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const dueDateValue = formData.get("dueDate");
  const { error } = await supabase.from("quests").update({ title: cleanQuestTitle(formData.get("title")), due_date: typeof dueDateValue === "string" && dueDateValue ? dueDateValue : null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quests");
}

export async function deleteQuest(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quests").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath("/quests");
}

export async function createQuestStep(formData: FormData) {
  const { supabase } = await requireUser();
  const questId = String(formData.get("questId") ?? "");
  const { count, error: countError } = await supabase.from("quest_steps").select("id", { count: "exact", head: true }).eq("quest_id", questId);
  if (countError) throw new Error(countError.message);
  const { error } = await supabase.from("quest_steps").insert({ quest_id: questId, title: cleanQuestTitle(formData.get("title")), position: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath("/quests");
}

export async function completeQuestStep(formData: FormData) {
  const { supabase } = await requireUser();
  const evidence = completionEvidence(formData.get("evidenceType"), formData.get("evidenceValue"));
  const { error } = await supabase.rpc("complete_quest_step", { p_step_id: String(formData.get("stepId") ?? ""), p_evidence_type: evidence.type, p_evidence_value: evidence.value });
  if (error) throw new Error(error.message);
  revalidatePath("/quests");
}
