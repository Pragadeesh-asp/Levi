import Link from "next/link";
import { formatXp, levelForXp } from "@/lib/utils";

const previewQuests = [
  ["Become Job Ready", 0], ["Build Strong Physique", 0], ["Become Financially Stable", 0], ["Strengthen My Faith", 0],
] as const;

export default function DashboardPage() {
  const xp = 0;
  return <main className="shell"><header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 28 }}><div><p className="eyebrow">Command center</p><h1 style={{ margin: "4px 0" }}>What matters right now?</h1></div><Link className="button secondary" href="/login">Sign in</Link></header><div className="grid"><section className="panel"><p className="eyebrow">Player</p><h2>Level {levelForXp(xp)}</h2><p className="muted">{formatXp(xp)} XP · Execution is the goal.</p></section><section className="panel"><p className="eyebrow">Today · primary win</p><h2>Choose one real outcome.</h2><p className="muted">Sign in and create your first evidence-backed quest step.</p></section><section className="panel"><p className="eyebrow">Focus mode</p><h2>No active focus session</h2><p className="muted">One outcome. One next action. Record blockers.</p></section></div><section className="panel" style={{ marginTop: 16 }}><p className="eyebrow">Main quests</p>{previewQuests.map(([title, progress]) => <div className="quest" key={title}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{title}</strong><span className="muted">{progress}% · Not started</span></div><div className="bar" style={{ marginTop: 10 }}><span style={{ width: `${progress}%` }} /></div></div>)}</section><p className="muted" style={{ marginTop: 16 }}>Preview mode until Supabase is configured. Progress will be computed from completed, evidenced steps—never set independently.</p></main>;
}
