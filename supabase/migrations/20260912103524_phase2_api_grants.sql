-- Phase 2 API hardening: least-privilege client grants.

begin;

revoke all on table public.profiles, public.quests, public.quest_steps, public.xp_ledger from anon, authenticated;
revoke all on table public.quest_progress from anon, authenticated;

-- Profiles are created by the auth trigger and are only read/edited by their owner.
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- Quests: authenticated users own their rows, may create/delete them, and may
-- edit only user-facing metadata. Ownership/hierarchy columns are immutable.
grant select, insert, delete on table public.quests to authenticated;
grant update (title, due_date) on table public.quests to authenticated;

-- Steps: authenticated users can read and create steps. Completion and all
-- completion evidence mutation stays inside the controlled RPC.
grant select, insert on table public.quest_steps to authenticated;

-- XP is append-only from the application's perspective and is never directly
-- writable by client roles.
grant select on table public.xp_ledger to authenticated;

grant select on table public.quest_progress to authenticated;

revoke references, trigger, truncate on table public.profiles, public.quests, public.quest_steps, public.xp_ledger from anon, authenticated;
revoke references, trigger, truncate on table public.quest_progress from anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

commit;
