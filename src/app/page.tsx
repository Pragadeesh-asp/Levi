import Link from "next/link";

export default function HomePage() {
  return <main className="shell" style={{ maxWidth: 720, paddingTop: 100 }}>
    <p className="eyebrow">LEVI OS · v0.1</p>
    <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", margin: "12px 0" }}>Live what matters.</h1>
    <p className="muted" style={{ fontSize: "1.15rem", lineHeight: 1.6 }}>An evidence-based personal operating system for daily execution, not an endless task list.</p>
    <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
      <Link className="button" href="/dashboard">Open command center</Link>
      <Link className="button secondary" href="/login">Sign in</Link>
    </div>
  </main>;
}
