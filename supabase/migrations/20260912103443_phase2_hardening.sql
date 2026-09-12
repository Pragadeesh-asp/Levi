-- Phase 2 hardening: protect completion state and rewarded quest history.

begin;

-- Pin every SECURITY DEFINER function to an empty search_path so callers cannot
-- influence name resolution while privileged code is running.
alter function public.set_updated_at() set search_path = '';
alter function public.assert_quest_parent_is_owned() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.award_completed_quest_xp(uuid, uuid) set search_path = '';
alter function public.complete_quest_step(uuid, public.evidence_type, text) set search_path = '';

-- Trigger-only helpers must never be reachable through the Data API.
revoke all on function public.assert_quest_parent_is_owned() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Quest metadata is user-editable, but ownership and hierarchy are immutable
-- after creation through the Data API.
revoke update on table public.quests from authenticated;
grant update (title, due_date) on table public.quests to authenticated;

-- Step completion is a domain transition, not a generic row update. The only
-- supported completion path is the authenticated, evidence-checked RPC.
drop policy if exists "steps follow owned quests" on public.quest_steps;
create policy "steps are readable on owned quests" on public.quest_steps
  for select to authenticated
  using (exists (
    select 1 from public.quests q
    where q.id = quest_steps.quest_id and q.user_id = (select auth.uid())
  ));
create policy "steps can be created on owned quests" on public.quest_steps
  for insert to authenticated
  with check (exists (
    select 1 from public.quests q
    where q.id = quest_steps.quest_id and q.user_id = (select auth.uid())
  ));
revoke update, delete on table public.quest_steps from authenticated;
grant select, insert on table public.quest_steps to authenticated;

-- A rewarded quest is an auditable historical outcome. It cannot be deleted,
-- and no new step can be added after its completion reward exists.
create or replace function public.prevent_rewarded_quest_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.xp_ledger
    where user_id = old.user_id
      and source = 'quest_completion'::public.xp_source
      and source_id = old.id
  ) then
    raise exception 'A quest with awarded XP cannot be deleted';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_rewarded_quest_delete() from public, anon, authenticated;
drop trigger if exists quests_prevent_rewarded_delete on public.quests;
create trigger quests_prevent_rewarded_delete
before delete on public.quests
for each row execute function public.prevent_rewarded_quest_delete();

create or replace function public.prevent_step_insert_after_reward()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.xp_ledger
    where user_id = (select auth.uid())
      and source = 'quest_completion'::public.xp_source
      and source_id = new.quest_id
  ) then
    raise exception 'A rewarded quest cannot receive new steps';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_step_insert_after_reward() from public, anon, authenticated;
drop trigger if exists quest_steps_prevent_insert_after_reward on public.quest_steps;
create trigger quest_steps_prevent_insert_after_reward
before insert on public.quest_steps
for each row execute function public.prevent_step_insert_after_reward();

commit;
