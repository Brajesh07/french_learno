-- Stages 1–2 only. Requires migrations 001–009.
-- Additive storage; no content backfill, route changes, submission API or reward
-- algorithm. Existing MCQ tables and APIs retain their current behavior.
-- New content has NO direct student SELECT policy: authorized delivery follows
-- in a later stage. No browser (including an admin) can mutate these tables.
-- quiz_question_keys is private by privileges + RLS, not by an API projection.
begin;

-- Composite FK target prevents attaching a question to another teacher's quiz.
alter table public.quiz_questions
  add constraint quiz_questions_id_quiz_unique unique (id, quiz_id);

create table public.quiz_revisions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  revision integer not null check (revision > 0),
  schema_version integer not null default 1 check (schema_version = 1),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  kind text not null default 'lesson' check (kind in ('lesson','quiz')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 4000),
  objective text not null check (char_length(btrim(objective)) between 1 and 2000),
  target_language text not null default 'fr-FR' check (target_language = 'fr-FR'),
  instruction_language text not null default 'en' check (instruction_language = 'en'),
  proficiency text not null default 'A1' check (proficiency in ('A1','A2','B1','B2','C1','C2')),
  access_tier text not null default 'free' check (access_tier in ('free','premium')),
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  scoring_policy text not null default 'first_attempt_equal_v1' check (scoring_policy = 'first_attempt_equal_v1'),
  reward_policy_version text not null default 'foundations-v1' check (reward_policy_version = 'foundations-v1'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quiz_id, revision),
  unique (id, quiz_id),
  check ((status = 'draft' and published_at is null) or (status <> 'draft' and published_at is not null))
);
create unique index quiz_revisions_one_published on public.quiz_revisions(quiz_id) where status = 'published';

create table public.quiz_question_revisions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  quiz_id uuid not null,
  content_revision integer not null check (content_revision > 0),
  schema_version integer not null default 1 check (schema_version = 1),
  type text not null check (type in ('multiple_choice','typed_recall','sentence_builder','listening_choice')),
  target_language text not null default 'fr-FR' check (target_language = 'fr-FR'),
  instruction_language text not null default 'en' check (instruction_language = 'en'),
  proficiency text not null default 'A1' check (proficiency in ('A1','A2','B1','B2','C1','C2')),
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  skill_ids text[] not null default '{}' check (cardinality(skill_ids) <= 20),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  reward_class text not null default 'standard' check (reward_class in ('standard','builder')),
  presentation jsonb not null check (
    jsonb_typeof(presentation) = 'object' and octet_length(presentation::text) <= 65536
    and not (presentation ?| array['assessment','feedback','correctAnswer','correctOptionId','acceptedAnswers','acceptedSequences'])
    and jsonb_typeof(presentation->'prompt') = 'object'
    and jsonb_typeof(presentation->'instructions') = 'object'
    and jsonb_typeof(presentation->'interaction') = 'object'
    and jsonb_typeof(presentation->'hints') = 'array'
    and jsonb_typeof(presentation->'media') = 'array'
    and presentation ?& array['prompt','instructions','interaction','hints','media']
  ),
  created_at timestamptz not null default now(),
  foreign key (question_id, quiz_id) references public.quiz_questions(id, quiz_id) on delete restrict,
  unique (question_id, content_revision),
  unique (id, type),
  unique (id, quiz_id, question_id)
);
create index quiz_question_revisions_quiz on public.quiz_question_revisions(quiz_id);

-- Private answer keys and feedback are never embedded in presentation JSON.
-- Full recursive runtime validation is still mandatory in the future authoring
-- API: SQL's JSON envelope checks are not a replacement for typed validation.
create table public.quiz_question_keys (
  question_revision_id uuid primary key,
  type text not null,
  assessment jsonb not null check (
    jsonb_typeof(assessment) = 'object' and octet_length(assessment::text) <= 65536
    and assessment @> '{"gradingVersion":1,"maxScore":1}'::jsonb
    and coalesce(case
      when type in ('multiple_choice','listening_choice') then
        assessment->>'gradingStrategy' = 'single_option' and jsonb_typeof(assessment->'correctOptionId') = 'string'
      when type = 'typed_recall' then
        assessment->>'gradingStrategy' = 'accepted_text' and assessment->>'normalizationPolicy' = 'fr-basic-v1'
        and jsonb_typeof(assessment->'acceptedAnswers') = 'array'
      when type = 'sentence_builder' then
        assessment->>'gradingStrategy' = 'ordered_tokens' and jsonb_typeof(assessment->'acceptedSequences') = 'array'
      else false end, false)
  ),
  feedback jsonb not null check (
    jsonb_typeof(feedback) = 'object' and octet_length(feedback::text) <= 65536
    and feedback ?& array['correctAnswerDisplay','explanation']
    and jsonb_typeof(feedback->'correctAnswerDisplay') = 'string'
    and jsonb_typeof(feedback->'explanation') = 'object'
  ),
  foreign key (question_revision_id, type) references public.quiz_question_revisions(id, type) on delete restrict
);

create table public.quiz_revision_items (
  quiz_revision_id uuid not null,
  quiz_id uuid not null,
  question_id uuid not null,
  question_revision_id uuid not null,
  position integer not null check (position between 1 and 50),
  primary key (quiz_revision_id, position),
  unique (quiz_revision_id, question_id),
  foreign key (quiz_revision_id, quiz_id) references public.quiz_revisions(id, quiz_id) on delete restrict,
  foreign key (question_revision_id, quiz_id, question_id)
    references public.quiz_question_revisions(id, quiz_id, question_id) on delete restrict
);
create index quiz_revision_items_question on public.quiz_revision_items(question_revision_id);

create table public.learning_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('audio','image')),
  bucket_id text not null default 'gamification-assets' check (bucket_id = 'gamification-assets'),
  storage_path text not null check (
    char_length(storage_path) between 1 and 1000 and storage_path like owner_id::text || '/%'
    and position('..' in storage_path) = 0
  ),
  mime_type text not null check (mime_type in ('audio/mpeg','audio/wav','audio/ogg','audio/mp4','image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 26214400),
  duration_ms integer check (duration_ms between 1 and 600000),
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path),
  check ((kind = 'audio' and mime_type like 'audio/%') or (kind = 'image' and mime_type like 'image/%'))
);
create index learning_assets_owner on public.learning_assets(owner_id);
create table public.quiz_question_assets (
  question_revision_id uuid not null references public.quiz_question_revisions(id) on delete restrict,
  asset_id uuid not null references public.learning_assets(id) on delete restrict,
  usage text not null check (usage in ('presentation','feedback')),
  primary key (question_revision_id, asset_id, usage)
);
create index quiz_question_assets_asset on public.quiz_question_assets(asset_id);

-- A private bucket, with no new browser storage policies. Future authorized
-- upload/delivery endpoints use the service client after ownership/access checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gamification-assets', 'gamification-assets', false, 26214400,
  array['audio/mpeg','audio/wav','audio/ogg','audio/mp4','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
do $$ begin
  if exists (select 1 from storage.buckets where id = 'gamification-assets' and public) then
    raise exception 'gamification-assets must be private';
  end if;
end $$;

-- Restrictive policy also blocks this bucket if an older, permissive storage
-- policy exists elsewhere. No existing bucket is granted or denied new access.
create policy "Gamification assets use authorized server delivery"
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'gamification-assets')
with check (bucket_id <> 'gamification-assets');

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  quiz_revision_id uuid references public.quiz_revisions(id) on delete restrict,
  mode text not null check (mode in ('lesson','daily','review','words','listening')),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  question_count integer not null check (question_count between 1 and 50),
  activity_date date not null,
  time_zone text not null check (char_length(time_zone) between 1 and 100),
  reward_policy_version text not null default 'foundations-v1' check (reward_policy_version = 'foundations-v1'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  check (mode <> 'lesson' or quiz_revision_id is not null),
  check ((status = 'completed') = (completed_at is not null))
);
create index learning_sessions_student_date on public.learning_sessions(user_id, activity_date desc);
create table public.learning_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions(id) on delete restrict,
  question_revision_id uuid not null,
  type text not null,
  position integer not null check (position between 1 and 50),
  display_order jsonb not null default '[]' check (jsonb_typeof(display_order) = 'array' and octet_length(display_order::text) <= 4096),
  review_eligible boolean not null default false,
  unique (session_id, position),
  unique (session_id, question_revision_id),
  unique (id, session_id, type),
  foreign key (question_revision_id, type) references public.quiz_question_revisions(id, type) on delete restrict
);
create table public.learning_responses (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null unique,
  session_id uuid not null,
  user_id uuid not null,
  type text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  idempotency_key uuid not null,
  response jsonb not null check (jsonb_typeof(response) = 'object' and octet_length(response::text) <= 16384),
  assistance jsonb not null default '{"hintIds":[],"transcriptShown":false}' check (
    jsonb_typeof(assistance) = 'object' and octet_length(assistance::text) <= 4096
    and assistance ?& array['hintIds','transcriptShown']
    and jsonb_typeof(assistance->'hintIds') = 'array' and jsonb_typeof(assistance->'transcriptShown') = 'boolean'
  ),
  is_correct boolean not null,
  score integer not null check (score in (0,1)),
  grading_version integer not null default 1 check (grading_version = 1),
  feedback jsonb not null check (jsonb_typeof(feedback) = 'object' and octet_length(feedback::text) <= 65536),
  hearts_delta integer not null check (hearts_delta between -1 and 1),
  created_at timestamptz not null default now(),
  check (is_correct = (score = 1)),
  unique (user_id, idempotency_key),
  unique (id, session_id, user_id),
  foreign key (session_id, user_id) references public.learning_sessions(id, user_id) on delete restrict,
  foreign key (session_question_id, session_id, type) references public.learning_session_questions(id, session_id, type) on delete restrict
);
create index learning_responses_session on public.learning_responses(session_id);
create table public.learning_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  response_id uuid,
  reason text not null check (reason in ('correct_answer','review_answer','lesson_completion','perfect_completion','daily_completion')),
  -- Server-generated semantic identity, e.g. daily:<activity-date>. Never use a
  -- random request UUID here: uniqueness must survive newly generated requests.
  source_key text not null check (char_length(source_key) between 1 and 250),
  policy_version text not null default 'foundations-v1' check (policy_version = 'foundations-v1'),
  xp integer not null default 0 check (xp between 0 and 1000),
  coins integer not null default 0 check (coins between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, source_key),
  foreign key (session_id, user_id) references public.learning_sessions(id, user_id) on delete restrict,
  foreign key (response_id, session_id, user_id) references public.learning_responses(id, session_id, user_id) on delete restrict,
  check ((reason in ('correct_answer','review_answer')) = (response_id is not null))
);
create table public.learning_review_state (
  user_id uuid not null references public.profiles(id) on delete restrict,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  last_question_revision_id uuid not null,
  quiz_id uuid not null,
  stage integer not null default 0 check (stage between 0 and 4),
  misses integer not null default 0 check (misses >= 0),
  due_date date not null,
  last_reviewed_at timestamptz,
  primary key (user_id, question_id),
  foreign key (last_question_revision_id, quiz_id, question_id)
    references public.quiz_question_revisions(id, quiz_id, question_id) on delete restrict
);
create index learning_review_due on public.learning_review_state(user_id, due_date);
create table public.learning_totals (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  xp bigint not null default 0 check (xp between 0 and 9007199254740991),
  coins bigint not null default 0 check (coins between 0 and 9007199254740991),
  hearts integer not null default 5 check (hearts between 0 and 5),
  answered bigint not null default 0 check (answered >= 0),
  correct bigint not null default 0 check (correct between 0 and answered),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

-- Lock published snapshots against subsequent mutation, including their keys.
create function public.guard_gamification_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Create a draft before publishing' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.quiz_id <> old.quiz_id or new.revision <> old.revision then
      raise exception 'Revision identity is immutable' using errcode = '23514';
    end if;
    if old.status <> 'draft' then
      if not (old.status = 'published' and new.status = 'archived'
        and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status')) then
        raise exception 'Published revision is immutable' using errcode = '23514';
      end if;
    elsif new.status = 'archived' then
      raise exception 'Only published revisions can be archived' using errcode = '23514';
    elsif new.status = 'published' then
      -- Serialize publication with asset-link insertion for these snapshots.
      perform 1 from public.quiz_question_revisions q where q.id in (
        select question_revision_id from public.quiz_revision_items where quiz_revision_id = new.id
      ) order by q.id for update;
      if not exists (select 1 from public.quiz_revision_items where quiz_revision_id = new.id)
        or exists (select 1 from public.quiz_revision_items i left join public.quiz_question_keys k
          on k.question_revision_id = i.question_revision_id where i.quiz_revision_id = new.id and k.question_revision_id is null) then
        raise exception 'Published modules require questions and private keys' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger guard_gamification_revision before insert or update on public.quiz_revisions
for each row execute function public.guard_gamification_revision();

-- Question snapshots, keys and asset links are append-only: editing creates a
-- new question revision, even in a draft. Draft module items may be replaced.
create function public.guard_gamification_item()
returns trigger language plpgsql set search_path = '' as $$
declare parent_status text;
begin
  if tg_op = 'UPDATE' and (new.quiz_revision_id <> old.quiz_revision_id or new.quiz_id <> old.quiz_id) then
    raise exception 'Module item identity is immutable' using errcode = '23514';
  end if;
  select status into parent_status from public.quiz_revisions
    where id = case when tg_op = 'DELETE' then old.quiz_revision_id else new.quiz_revision_id end for update;
  if parent_status is distinct from 'draft' then
    raise exception 'Only draft module items can change' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger guard_gamification_item before insert or update or delete on public.quiz_revision_items
for each row execute function public.guard_gamification_item();

create function public.guard_gamification_asset_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.quiz_question_revisions where id = new.question_revision_id for update;
  if not exists (
    select 1 from public.quiz_question_revisions r join public.quizzes q on q.id = r.quiz_id
      join public.learning_assets a on a.id = new.asset_id
      where r.id = new.question_revision_id and a.owner_id = q.created_by and a.status = 'ready'
  ) then raise exception 'Asset must be ready and owned by the quiz teacher' using errcode = '23514'; end if;
  if exists (select 1 from public.quiz_revision_items i join public.quiz_revisions r on r.id = i.quiz_revision_id
    where i.question_revision_id = new.question_revision_id and r.status <> 'draft') then
    raise exception 'Published asset links are immutable' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger guard_gamification_asset_link before insert on public.quiz_question_assets
for each row execute function public.guard_gamification_asset_link();

create function public.guard_learning_session_question()
returns trigger language plpgsql set search_path = '' as $$
declare s public.learning_sessions;
begin
  select * into s from public.learning_sessions where id = new.session_id for update;
  if s.status is distinct from 'active' or new.position > s.question_count then
    raise exception 'Session is closed or question position is out of range' using errcode = '23514';
  end if;
  if s.quiz_revision_id is not null and not exists (
    select 1 from public.quiz_revision_items where quiz_revision_id = s.quiz_revision_id
      and question_revision_id = new.question_revision_id
  ) then raise exception 'Question does not belong to pinned module revision' using errcode = '23514'; end if;
  return new;
end $$;
create trigger guard_learning_session_question before insert on public.learning_session_questions
for each row execute function public.guard_learning_session_question();

-- Privileges are reset explicitly rather than relying on Supabase defaults.
do $$ declare t text; begin
  foreach t in array array['quiz_revisions','quiz_question_revisions','quiz_question_keys','quiz_revision_items',
    'learning_assets','quiz_question_assets','learning_sessions','learning_session_questions','learning_responses',
    'learning_reward_events','learning_review_state','learning_totals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert on public.%I to service_role', t);
  end loop;
end $$;
grant update on public.quiz_revisions,
  public.learning_review_state, public.learning_totals to service_role;
grant update (status) on public.learning_assets to service_role;
grant update (status, completed_at) on public.learning_sessions to service_role;
grant update, delete on public.quiz_revision_items to service_role;
-- No UPDATE/DELETE grants on private keys, question snapshots, responses or rewards.

create policy "Staff read module revisions" on public.quiz_revisions for select to authenticated
using (public.is_admin() or public.owns_quiz(quiz_id));
create policy "Staff read question revisions" on public.quiz_question_revisions for select to authenticated
using (public.is_admin() or public.owns_quiz(quiz_id));
create policy "Staff read private grading keys" on public.quiz_question_keys for select to authenticated
using (public.is_admin() or exists (select 1 from public.quiz_question_revisions r
  where r.id = question_revision_id and public.owns_quiz(r.quiz_id)));
create policy "Staff read module items" on public.quiz_revision_items for select to authenticated
using (public.is_admin() or public.owns_quiz(quiz_id));
create policy "Staff read owned assets" on public.learning_assets for select to authenticated
using (public.is_admin() or (owner_id = (select auth.uid()) and public.is_approved_teacher()));
create policy "Staff read question asset links" on public.quiz_question_assets for select to authenticated
using (public.is_admin() or exists (select 1 from public.quiz_question_revisions r
  where r.id = question_revision_id and public.owns_quiz(r.quiz_id)));
create policy "Students read own sessions" on public.learning_sessions for select to authenticated
using (public.is_admin() or (user_id = (select auth.uid()) and public.current_app_role() = 'student'));
create policy "Students read own session items" on public.learning_session_questions for select to authenticated
using (public.is_admin() or exists (select 1 from public.learning_sessions s
  where s.id = session_id and s.user_id = (select auth.uid()) and public.current_app_role() = 'student'));
create policy "Students read own responses" on public.learning_responses for select to authenticated
using (public.is_admin() or (user_id = (select auth.uid()) and public.current_app_role() = 'student'));
create policy "Students read own reward events" on public.learning_reward_events for select to authenticated
using (public.is_admin() or (user_id = (select auth.uid()) and public.current_app_role() = 'student'));
create policy "Students read own review state" on public.learning_review_state for select to authenticated
using (public.is_admin() or (user_id = (select auth.uid()) and public.current_app_role() = 'student'));
create policy "Students read own totals" on public.learning_totals for select to authenticated
using (public.is_admin() or (user_id = (select auth.uid()) and public.current_app_role() = 'student'));

revoke all on function public.guard_gamification_revision(), public.guard_gamification_item(),
  public.guard_gamification_asset_link(), public.guard_learning_session_question() from public, anon, authenticated, service_role;

comment on table public.quiz_question_keys is 'Private grading and post-answer feedback. Students have no SELECT policy. Never embed in presentation JSON.';
comment on table public.learning_responses is 'One immutable first-attempt result per session question. Secure submission and runtime payload validation are implemented in the next stage.';
comment on table public.learning_reward_events is 'Append-only server ledger. A trusted transaction must generate semantic source keys, grant rewards and update totals atomically.';
comment on table public.quiz_question_revisions is 'Append-only snapshots. Legacy quiz_questions remain the lineage anchors; MCQ backfill is intentionally deferred.';
comment on table public.learning_sessions is 'Server-owned session state. Future API must check publication, entitlement, membership, active student and supported schema before use.';
comment on table public.learning_totals is 'New trusted aggregates; no automatic import of legacy client-scored totals.';

commit;
