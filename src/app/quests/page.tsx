import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { completeQuestStep, createQuest, createQuestStep, deleteQuest, updateQuest } from "./actions";

export default async function QuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="shell"><section className="panel"><p className="eyebrow">Quest engine</p><h1>Sign in to create your quest map.</h1><p className="muted">Progress and XP are always calculated from your evidence-backed work.</p><Link className="button" href="/login">Sign in</Link></section></main>;

  const [{ data: quests, error: questError }, { data: steps, error: stepError }] = await Promise.all([
    supabase.from("quest_progress").select("*").order("created_at"),
    supabase.from("quest_steps").select("*").order("position"),
  ]);
  if (questError || stepError) throw new Error(questError?.message ?? stepError?.message);
  const mainQuests = (quests ?? []).filter((quest) => quest.kind === "main");

  return <main className="shell"><header style={{ marginBottom: 24 }}><p className="eyebrow">Quest engine</p><h1 style={{ margin: "4px 0" }}>Make progress provable.</h1><p className="muted">A completed step requires evidence. Status is derived; it cannot be edited.</p></header>
    <section className="panel" style={{ marginBottom: 16 }}><h2 style={{ marginTop: 0 }}>Add main quest</h2><form action={createQuest} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><input name="title" required maxLength={160} placeholder="e.g. Become Job Ready" style={{ flex: 1, minWidth: 220, padding: 10, borderRadius: 8 }} /><input name="dueDate" type="date" style={{ padding: 10, borderRadius: 8 }} /><input name="kind" type="hidden" value="main" /><button className="button">Create main quest</button></form></section>
    {mainQuests.length === 0 ? <section className="panel"><p className="muted">No quests yet. Start with a real outcome, not a vague category.</p></section> : mainQuests.map((mainQuest) => {
      const subquests = (quests ?? []).filter((quest) => quest.parent_quest_id === mainQuest.id);
      return <section className="panel" key={mainQuest.id} style={{ marginBottom: 16 }}><QuestHeader quest={mainQuest} /><form action={createQuest} style={{ display: "flex", gap: 8, marginTop: 14 }}><input name="title" required maxLength={160} placeholder="Add a concrete subquest" style={{ flex: 1, padding: 10, borderRadius: 8 }} /><input name="kind" type="hidden" value="subquest" /><input name="parentQuestId" type="hidden" value={mainQuest.id} /><button className="button secondary">Add subquest</button></form>
        {subquests.map((subquest) => <article className="quest" key={subquest.id}><QuestHeader quest={subquest} />
          <form action={createQuestStep} style={{ display: "flex", gap: 8, marginTop: 12 }}><input name="title" required maxLength={240} placeholder="Add the next verifiable step" style={{ flex: 1, padding: 10, borderRadius: 8 }} /><input name="questId" type="hidden" value={subquest.id} /><button className="button secondary">Add step</button></form>
          {(steps ?? []).filter((step) => step.quest_id === subquest.id).map((step) => <div key={step.id} style={{ borderTop: "1px solid var(--edge)", marginTop: 12, paddingTop: 12 }}><strong>{step.title}</strong>{step.completed_at ? <p className="muted">Completed with {step.evidence_type} evidence.</p> : <details><summary style={{ cursor: "pointer", marginTop: 8 }}>Complete with evidence</summary><form action={completeQuestStep} style={{ display: "grid", gap: 8, marginTop: 8 }}><input name="stepId" type="hidden" value={step.id} /><select name="evidenceType" defaultValue="note" style={{ padding: 10, borderRadius: 8 }}><option value="note">Note</option><option value="url">URL</option><option value="file">File reference</option><option value="metric">Metric</option></select><textarea name="evidenceValue" required maxLength={4000} placeholder="What proves this step is complete?" style={{ minHeight: 70, padding: 10, borderRadius: 8 }} /><button className="button">Record completion</button></form></details>}</div>)}
        </article>)}</section>;
    })}</main>;
}

type QuestHeaderProps = { quest: { id: string; title: string; due_date: string | null; progress_percent: number; status: string } };
function QuestHeader({ quest }: QuestHeaderProps) {
  return <div><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><strong>{quest.title}</strong><p className="muted" style={{ margin: "4px 0" }}>{quest.progress_percent}% · {quest.status.replace("_", " ")}{quest.due_date ? ` · due ${quest.due_date}` : ""}</p></div><details><summary style={{ cursor: "pointer" }}>Edit</summary><form action={updateQuest} style={{ display: "grid", gap: 8, marginTop: 8 }}><input name="id" type="hidden" value={quest.id} /><input name="title" required defaultValue={quest.title} maxLength={160} style={{ padding: 8, borderRadius: 8 }} /><input name="dueDate" type="date" defaultValue={quest.due_date ?? ""} style={{ padding: 8, borderRadius: 8 }} /><button className="button secondary">Save</button></form><form action={deleteQuest} style={{ marginTop: 8 }}><input name="id" type="hidden" value={quest.id} /><button className="button secondary">Delete</button></form></details></div><div className="bar"><span style={{ width: `${quest.progress_percent}%` }} /></div></div>;
}
