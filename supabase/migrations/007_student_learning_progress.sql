-- Isolated gamified progress. Does not alter profiles, existing course/quiz
-- progress, auth triggers, admin policies, or any existing table.
begin;

create table public.student_learning_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  selected_language text not null check (selected_language = 'fr-FR'),
  state jsonb not null check (
    jsonb_typeof(state) = 'object'
    and state ? 'version'
    and state ->> 'version' = '1'
    and octet_length(state::text) <= 131072
  ),
  revision bigint not null default 1 check (revision > 0),
  last_mutation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_learning_progress enable row level security;
revoke all on public.student_learning_progress from anon, authenticated;
grant select, insert, update on public.student_learning_progress to authenticated;

create policy "Students read their own learning progress"
  on public.student_learning_progress for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
    )
  );

create policy "Students create their own learning progress"
  on public.student_learning_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
    )
  );

create policy "Students update their own learning progress"
  on public.student_learning_progress for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
    )
  );

comment on table public.student_learning_progress is
  'Per-student gamified practice snapshots. Client-scored; not authoritative grades or leaderboard results.';

commit;
