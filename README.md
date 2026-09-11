# LEVI OS

An evidence-based personal operating system. The dashboard is intentionally action-first: core progress is derived from completed quest steps, and XP is an auditable event ledger.

## Current architecture assessment

The original repository contained one standalone `Index.html`: an interactive birthday-message site. It is intentionally preserved as a legacy artifact and is not part of the LEVI OS application runtime.

This phase adds a Next.js App Router + TypeScript foundation, Tailwind styling, Supabase Auth client/server adapters, a normalized initial PostgreSQL migration with RLS, a preview dashboard, and unit coverage for the core progression rules. No prior app architecture, backend, tests, CI, package manager, or deployment configuration existed.

## Local setup

1. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
2. Apply both migration files in timestamp order through the existing LEVI OS Supabase project. The second migration hardens the initial RLS policies, adds computed quest progress, and exposes only the controlled completion function for XP.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

## Implementation order

1. Phase 1 (complete in repository): foundation, auth, core schema/types.
2. Phase 2 (complete in repository): quest CRUD, evidence-backed completion, computed progress/status, and idempotent quest XP.
3. Phase 3: levels and broader XP sources.
4. Phase 4 onward: daily loop, dashboard/focus, reviews, domain systems, then AI as a read-only advisor.

Never expose a Supabase service-role key to the browser. Use only the publishable key in `.env.local`.
