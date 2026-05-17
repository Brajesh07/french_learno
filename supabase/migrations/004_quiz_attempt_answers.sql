-- Migration: 004_quiz_attempt_answers
-- Stores per-question student responses for each quiz attempt,
-- enabling detailed result breakdowns (correct/wrong per question).

create table if not exists public.quiz_attempt_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id        uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer_id uuid references public.quiz_answers(id) on delete set null,
  is_correct         boolean not null,
  created_at         timestamptz default now()
);

create index if not exists idx_quiz_attempt_answers_attempt_id
  on public.quiz_attempt_answers(attempt_id);

-- RLS
alter table public.quiz_attempt_answers enable row level security;

-- Students can read their own attempt answers
create policy "Users can read own attempt answers"
  on public.quiz_attempt_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = attempt_id
        and quiz_attempts.user_id = auth.uid()
    )
  );

-- Admins can read all attempt answers
create policy "Admins can read all attempt answers"
  on public.quiz_attempt_answers for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Service role inserts (used by the submit API via createAdminClient)
create policy "Service role can insert attempt answers"
  on public.quiz_attempt_answers for insert
  with check (true);
