-- LEVI OS Phase 1: user-scoped, evidence-first foundation.
create extension if not exists "pgcrypto";

create type public.quest_kind as enum ('main', 'subquest');
create type public.evidence_type as enum ('note', 'url', 'file', 'metric');
create type public.xp_source as enum ('quest_completion', 'daily_mission', 'habit', 'milestone', 'bonus');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_quest_id uuid references public.quests(id) on delete cascade, title text not null check (char_length(trim(title)) between 1 and 160),
  kind public.quest_kind not null default 'main', due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((kind = 'main' and parent_quest_id is null) or (kind = 'subquest' and parent_quest_id is not null))
);
create index quests_user_id_idx on public.quests(user_id);
create index quests_parent_quest_id_idx on public.quests(parent_quest_id);

create table public.quest_steps (
  id uuid primary key default gen_random_uuid(), quest_id uuid not null references public.quests(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240), position integer not null check (position >= 0), completed_at timestamptz,
  evidence_type public.evidence_type, evidence_value text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((completed_at is null and evidence_type is null and evidence_value is null) or (completed_at is not null and evidence_type is not null and char_length(trim(coalesce(evidence_value, ''))) > 0)),
  unique (quest_id, position)
);
create index quest_steps_quest_id_idx on public.quest_steps(quest_id);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source public.xp_source not null, source_id uuid not null, amount integer not null check (amount > 0 and amount <= 10000),
  note text, awarded_at timestamptz not null default now(), unique (user_id, source, source_id)
);
create index xp_ledger_user_awarded_idx on public.xp_ledger(user_id, awarded_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger quests_set_updated_at before update on public.quests for each row execute procedure public.set_updated_at();
create trigger quest_steps_set_updated_at before update on public.quest_steps for each row execute procedure public.set_updated_at();

create or replace function public.assert_quest_parent_is_owned() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_quest_id is not null and not exists (select 1 from public.quests where id = new.parent_quest_id and user_id = new.user_id) then
    raise exception 'A subquest must belong to one of the user''s main quests';
  end if;
  return new;
end;
$$;
create trigger quests_verify_parent_owner before insert or update of parent_quest_id, user_id on public.quests for each row execute procedure public.assert_quest_parent_is_owned();

alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.quest_steps enable row level security;
alter table public.xp_ledger enable row level security;
create policy "profiles are private" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "quests are private" on public.quests for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "steps follow owned quests" on public.quest_steps for all using (exists (select 1 from public.quests q where q.id = quest_id and q.user_id = (select auth.uid()))) with check (exists (select 1 from public.quests q where q.id = quest_id and q.user_id = (select auth.uid())));
create policy "xp ledger is private" on public.xp_ledger for select using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id) values (new.id); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
