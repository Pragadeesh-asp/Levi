-- Phase 2: canonical quest progress, evidence-backed completion, and controlled XP.
-- Existing data is not modified by this migration.

-- A subquest is one level below a main quest. This keeps the progress model explainable.
create or replace function public.assert_quest_parent_is_owned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_quest_id is not null and not exists (
    select 1 from public.quests parent
    where parent.id = new.parent_quest_id
      and parent.user_id = new.user_id
      and parent.kind = 'main'
  ) then
    raise exception 'A subquest must belong to one of the user''s main quests';
  end if;
  return new;
end;
$$;

-- Re-scope the original policies to real authenticated sessions.
drop policy if exists "profiles are private" on public.profiles;
drop policy if exists "quests are private" on public.quests;
drop policy if exists "steps follow owned quests" on public.quest_steps;
drop policy if exists "xp ledger is private" on public.xp_ledger;
create policy "profiles select own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "quests are private" on public.quests for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "steps follow owned quests" on public.quest_steps for all to authenticated
  using (exists (select 1 from public.quests q where q.id = quest_id and q.user_id = (select auth.uid())))
  with check (exists (select 1 from public.quests q where q.id = quest_id and q.user_id = (select auth.uid())));
create policy "xp ledger is private" on public.xp_ledger for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.quests, public.quest_steps to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.xp_ledger to authenticated;

-- The view stores no state. It is the only progress/status representation.
create or replace view public.quest_progress with (security_invoker = true) as
with step_counts as (
  select q.id as quest_id,
    count(s.id)::integer as total_steps,
    count(s.id) filter (where s.completed_at is not null)::integer as completed_steps
  from public.quests q
  left join public.quest_steps s on s.quest_id = q.id
  group by q.id
), computed as (
  select q.id, q.user_id, q.parent_quest_id, q.title, q.kind, q.due_date, q.created_at, q.updated_at,
    case when q.kind = 'subquest' then
      case when sc.total_steps = 0 then 0 else round((sc.completed_steps::numeric / sc.total_steps) * 100)::integer end
    else coalesce((
      select round(avg(case when child_steps.total_steps = 0 then 0 else (child_steps.completed_steps::numeric / child_steps.total_steps) * 100 end))::integer
      from public.quests child
      join step_counts child_steps on child_steps.quest_id = child.id
      where child.parent_quest_id = q.id
    ), 0) end as progress_percent
  from public.quests q
  join step_counts sc on sc.quest_id = q.id
)
select *, case when progress_percent = 0 then 'not_started' when progress_percent = 100 then 'done' else 'in_progress' end::text as status
from computed;
grant select on public.quest_progress to authenticated;

-- This helper is deliberately not exposed. It validates ownership and calculated completion
-- before writing a fixed, auditable XP event. The unique ledger constraint makes it idempotent.
create or replace function public.award_completed_quest_xp(p_quest_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_kind public.quest_kind;
  v_parent_id uuid;
  v_amount integer;
  v_inserted integer;
  v_awarded boolean := false;
begin
  select kind, parent_quest_id into v_kind, v_parent_id
  from public.quests where id = p_quest_id and user_id = p_user_id;
  if not found then return false; end if;

  if v_kind = 'subquest' then
    if not exists (select 1 from public.quest_steps where quest_id = p_quest_id)
      or exists (select 1 from public.quest_steps where quest_id = p_quest_id and completed_at is null) then return false; end if;
    v_amount := 250;
  else
    if not exists (select 1 from public.quests where parent_quest_id = p_quest_id)
      or exists (
        select 1 from public.quests child
        where child.parent_quest_id = p_quest_id
          and (not exists (select 1 from public.quest_steps where quest_id = child.id)
            or exists (select 1 from public.quest_steps where quest_id = child.id and completed_at is null))
      ) then return false; end if;
    v_amount := 1000;
  end if;

  insert into public.xp_ledger (user_id, source, source_id, amount, note)
  values (p_user_id, 'quest_completion', p_quest_id, v_amount, 'Awarded from computed quest completion')
  on conflict (user_id, source, source_id) do nothing;
  get diagnostics v_inserted = row_count;
  v_awarded := v_inserted > 0;
  return v_awarded;
end;
$$;
revoke all on function public.award_completed_quest_xp(uuid, uuid) from public, anon, authenticated;

create or replace function public.complete_quest_step(
  p_step_id uuid, p_evidence_type public.evidence_type, p_evidence_value text
)
returns table (step_id uuid, completed_at timestamptz, xp_awarded boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_quest_id uuid;
  v_parent_quest_id uuid;
  v_completed_at timestamptz;
  v_xp_awarded boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if p_evidence_value is null or char_length(trim(p_evidence_value)) = 0 then raise exception 'Completion requires evidence'; end if;

  select s.quest_id, s.completed_at, q.parent_quest_id into v_quest_id, v_completed_at, v_parent_quest_id
  from public.quest_steps s join public.quests q on q.id = s.quest_id
  where s.id = p_step_id and q.user_id = v_user_id for update of s;
  if not found then raise exception 'Quest step not found'; end if;

  if v_completed_at is null then
    update public.quest_steps set completed_at = now(), evidence_type = p_evidence_type, evidence_value = trim(p_evidence_value)
    where id = p_step_id returning completed_at into v_completed_at;
  end if;
  v_xp_awarded := public.award_completed_quest_xp(v_quest_id, v_user_id);
  if v_parent_quest_id is not null then
    v_xp_awarded := public.award_completed_quest_xp(v_parent_quest_id, v_user_id) or v_xp_awarded;
  end if;
  return query select p_step_id, v_completed_at, v_xp_awarded;
end;
$$;
revoke all on function public.complete_quest_step(uuid, public.evidence_type, text) from public, anon;
grant execute on function public.complete_quest_step(uuid, public.evidence_type, text) to authenticated;
