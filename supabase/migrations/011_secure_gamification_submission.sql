-- Trusted per-question submission. Requires 010. No session-creation endpoint,
-- content migration, old quiz API changes or UI wiring is included here.
begin;
alter table public.learning_responses add column receipt jsonb
  check (receipt is null or (jsonb_typeof(receipt) = 'object' and octet_length(receipt::text) <= 131072));
comment on column public.learning_responses.receipt is 'Immutable committed response returned verbatim on identical retries, including totals at that revision.';

create function public.gamification_normalize_fr(p_value text)
returns text language sql immutable strict set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(replace(lower(normalize(p_value, NFC)), '’', ''''), '[.,!?]', '', 'g'), '\s+', ' ', 'g'));
$$;

-- Private helper. Validates the persisted key AND the submitted response before
-- grading. Malformed stored content fails closed (P0001), never counts as wrong.
create function public.grade_learning_response(p_type text, p_presentation jsonb, p_key jsonb, p_response jsonb)
returns boolean language plpgsql set search_path = '' as $$
declare ids text[]; submitted text[]; seq jsonb; opts jsonb; x jsonb; max_length integer;
begin
  if p_key is null or p_key->'gradingVersion' is distinct from '1'::jsonb
    or p_key->'maxScore' is distinct from '1'::jsonb then raise exception 'INVALID_CONTENT'; end if;
  if jsonb_typeof(p_response) is distinct from 'object' then raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
  if p_type in ('multiple_choice','listening_choice') then
    opts := p_presentation#>'{interaction,options}';
    if p_key->>'gradingStrategy' is distinct from 'single_option' or jsonb_typeof(opts) is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
    if jsonb_array_length(opts) not between 2 and 6 then raise exception 'INVALID_CONTENT'; end if;
    for x in select value from jsonb_array_elements(opts) loop
      if jsonb_typeof(x->'id') is distinct from 'string' or length(x->>'id') not between 1 and 100
        or jsonb_typeof(x->'text') is distinct from 'string' or length(btrim(x->>'text')) not between 1 and 500 then raise exception 'INVALID_CONTENT'; end if;
    end loop;
    select array_agg(value->>'id') into ids from jsonb_array_elements(opts);
    if cardinality(ids) <> (select count(distinct v) from unnest(ids) v)
      or jsonb_typeof(p_key->'correctOptionId') is distinct from 'string'
      or not coalesce(p_key->>'correctOptionId' = any(ids), false) then raise exception 'INVALID_CONTENT'; end if;
    if p_response - 'optionId' <> '{}'::jsonb or jsonb_typeof(p_response->'optionId') is distinct from 'string'
      or not coalesce(p_response->>'optionId' = any(ids), false) then raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
    return p_response->>'optionId' = p_key->>'correctOptionId';
  elsif p_type = 'typed_recall' then
    if p_key->>'gradingStrategy' is distinct from 'accepted_text' or p_key->>'normalizationPolicy' is distinct from 'fr-basic-v1'
      or jsonb_typeof(p_key->'acceptedAnswers') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
    if jsonb_array_length(p_key->'acceptedAnswers') not between 1 and 20 then raise exception 'INVALID_CONTENT'; end if;
    for x in select value from jsonb_array_elements(p_key->'acceptedAnswers') loop
      if jsonb_typeof(x) <> 'string' or length(x#>>'{}') > 500
        or length(public.gamification_normalize_fr(x#>>'{}')) = 0 then raise exception 'INVALID_CONTENT'; end if;
    end loop;
    if jsonb_typeof(p_presentation#>'{interaction,maxLength}') is distinct from 'number'
      or (p_presentation#>>'{interaction,maxLength}') !~ '^[0-9]{1,3}$' then raise exception 'INVALID_CONTENT'; end if;
    max_length := (p_presentation#>>'{interaction,maxLength}')::integer;
    if max_length not between 1 and 500 then raise exception 'INVALID_CONTENT'; end if;
    if p_response - 'text' <> '{}'::jsonb or jsonb_typeof(p_response->'text') is distinct from 'string'
      or length(p_response->>'text') > max_length or length(public.gamification_normalize_fr(p_response->>'text')) = 0 then
      raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
    return exists (select 1 from jsonb_array_elements_text(p_key->'acceptedAnswers') a
      where public.gamification_normalize_fr(a) = public.gamification_normalize_fr(p_response->>'text'));
  elsif p_type = 'sentence_builder' then
    opts := p_presentation#>'{interaction,tokens}';
    if p_key->>'gradingStrategy' is distinct from 'ordered_tokens' or jsonb_typeof(opts) is distinct from 'array'
      or jsonb_typeof(p_key->'acceptedSequences') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
    if jsonb_array_length(opts) not between 2 and 20 or jsonb_array_length(p_key->'acceptedSequences') not between 1 and 20 then raise exception 'INVALID_CONTENT'; end if;
    for x in select value from jsonb_array_elements(opts) loop
      if jsonb_typeof(x->'id') is distinct from 'string' or length(x->>'id') not between 1 and 100
        or jsonb_typeof(x->'text') is distinct from 'string' or length(btrim(x->>'text')) not between 1 and 500 then raise exception 'INVALID_CONTENT'; end if;
    end loop;
    select array_agg(value->>'id') into ids from jsonb_array_elements(opts);
    if cardinality(ids) <> (select count(distinct v) from unnest(ids) v) then raise exception 'INVALID_CONTENT'; end if;
    for seq in select value from jsonb_array_elements(p_key->'acceptedSequences') loop
      if jsonb_typeof(seq) <> 'array' then raise exception 'INVALID_CONTENT'; end if;
      if jsonb_array_length(seq) not between 1 and 20 then raise exception 'INVALID_CONTENT'; end if;
      if exists (select 1 from jsonb_array_elements(seq) t where jsonb_typeof(t) <> 'string') then raise exception 'INVALID_CONTENT'; end if;
      select array_agg(value) into submitted from jsonb_array_elements_text(seq);
      if not submitted <@ ids or cardinality(submitted) <> (select count(distinct v) from unnest(submitted) v) then raise exception 'INVALID_CONTENT'; end if;
    end loop;
    if p_response - 'tokenIds' <> '{}'::jsonb or jsonb_typeof(p_response->'tokenIds') is distinct from 'array' then raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
    if jsonb_array_length(p_response->'tokenIds') not between 1 and 20
      or exists (select 1 from jsonb_array_elements(p_response->'tokenIds') t where jsonb_typeof(t) <> 'string') then raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
    select array_agg(value) into submitted from jsonb_array_elements_text(p_response->'tokenIds');
    if not submitted <@ ids or cardinality(submitted) <> (select count(distinct v) from unnest(submitted) v) then raise exception 'INVALID_RESPONSE' using errcode='22023'; end if;
    return exists (select 1 from jsonb_array_elements(p_key->'acceptedSequences') a where a = p_response->'tokenIds');
  end if;
  raise exception 'INVALID_CONTENT';
end $$;

create function public.submit_learning_answer(p_session_id uuid, p_submission jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  student public.profiles; teacher public.profiles; approval text;
  s public.learning_sessions; sq public.learning_session_questions;
  q public.quiz_question_revisions; k public.quiz_question_keys;
  quiz public.quizzes; course public.courses; module public.quiz_revisions; live_module public.quiz_revisions;
  totals public.learning_totals; prior public.learning_responses; review public.learning_review_state;
  v_question_id uuid; retry_key uuid; response_id uuid := gen_random_uuid();
  answer jsonb; assistance jsonb; feedback jsonb; result jsonb;
  answer_correct boolean; passed boolean := false; finished boolean := false; due_review boolean := false;
  heart_change integer := 0; answer_xp integer := 0; bonus_xp integer := 0; bonus_coins integer := 0;
  total_answers integer; correct_answers integer; inserted integer; next_stage integer;
  today date; source text;
begin
  -- Do not accept identity, correctness, points, reward values or extra fields.
  if auth.uid() is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_submission is null or jsonb_typeof(p_submission) <> 'object' or octet_length(p_submission::text) > 16384 then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  if not p_submission ?& array['schemaVersion','sessionId','sessionQuestionId','idempotencyKey','type','response','assistance']
    or p_submission - array['schemaVersion','sessionId','sessionQuestionId','idempotencyKey','type','response','assistance'] <> '{}'::jsonb
    or p_submission->'schemaVersion' is distinct from '1'::jsonb then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  if (p_submission->>'sessionId')::uuid is distinct from p_session_id then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  v_question_id := (p_submission->>'sessionQuestionId')::uuid;
  retry_key := (p_submission->>'idempotencyKey')::uuid;
  if v_question_id is null or retry_key is null then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  answer := p_submission->'response'; assistance := p_submission->'assistance';
  if jsonb_typeof(answer) is distinct from 'object' or jsonb_typeof(assistance) is distinct from 'object'
    or not assistance ?& array['hintIds','transcriptShown'] or assistance - array['hintIds','transcriptShown'] <> '{}'::jsonb
    or jsonb_typeof(assistance->'hintIds') is distinct from 'array'
    or jsonb_typeof(assistance->'transcriptShown') is distinct from 'boolean' then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  if jsonb_array_length(assistance->'hintIds') > 3
    or exists (select 1 from jsonb_array_elements(assistance->'hintIds') h where jsonb_typeof(h) <> 'string' or length(h#>>'{}') not between 1 and 100)
    or jsonb_array_length(assistance->'hintIds') <> (select count(distinct h) from jsonb_array_elements_text(assistance->'hintIds') h) then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;

  select * into student from public.profiles where id = auth.uid() for share;
  if not found or student.role <> 'student' or not student.is_active or student.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  -- One lock per student serializes different tabs/sessions and all reward caps.
  insert into public.learning_totals(user_id) values(student.id) on conflict do nothing;
  select * into totals from public.learning_totals where user_id = student.id for update;
  select * into prior from public.learning_responses where user_id = student.id and idempotency_key = retry_key;
  if found then
    if prior.session_id <> p_session_id or prior.session_question_id <> v_question_id
      or prior.type is distinct from p_submission->>'type' or prior.response <> answer or prior.assistance <> assistance then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0003'; end if;
    if prior.receipt is null then raise exception 'RECEIPT_UNAVAILABLE'; end if;
    -- Historical receipt, not a new grading operation. Valid after completion.
    return prior.receipt;
  end if;
  select * into s from public.learning_sessions where id = p_session_id and user_id = student.id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  select * into sq from public.learning_session_questions where id = v_question_id and session_id = s.id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if exists(select 1 from public.learning_responses where session_question_id = sq.id) then raise exception 'ALREADY_ANSWERED' using errcode='P0003'; end if;
  if s.status <> 'active' then raise exception 'SESSION_CLOSED' using errcode='P0003'; end if;
  if sq.type is distinct from p_submission->>'type' then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  if s.reward_policy_version <> 'foundations-v1'
    or (select count(*) from public.learning_session_questions where session_id = s.id) <> s.question_count then raise exception 'INVALID_SESSION'; end if;
  if exists (select 1 from public.learning_session_questions i where i.session_id = s.id and i.position < sq.position
    and not exists(select 1 from public.learning_responses r where r.session_question_id = i.id)) then raise exception 'OUT_OF_ORDER' using errcode='P0003'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = s.time_zone) then raise exception 'INVALID_SESSION'; end if;
  today := (now() at time zone s.time_zone)::date;
  if s.activity_date <> (s.created_at at time zone s.time_zone)::date or s.created_at > now() then raise exception 'INVALID_SESSION'; end if;

  select * into strict q from public.quiz_question_revisions where id = sq.question_revision_id;
  select * into strict quiz from public.quizzes where id = q.quiz_id;
  -- Lock approval before content, matching the review/unpublish write path.
  select * into teacher from public.profiles where id = quiz.created_by for share;
  if not found or teacher.role <> 'teacher' or not teacher.is_active or teacher.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select verification_status into approval from public.teacher_profiles where id = teacher.id for share;
  if approval is distinct from 'approved' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into quiz from public.quizzes where id = q.quiz_id for share;
  select * into course from public.courses where id = quiz.course_id for share;
  if not found or course.is_published is distinct from true or course.created_by is distinct from teacher.id
    or quiz.is_published is distinct from true or quiz.created_by is distinct from teacher.id then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into live_module from public.quiz_revisions where quiz_id = quiz.id and status = 'published' for share;
  if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if s.quiz_revision_id is not null then
    select * into module from public.quiz_revisions where id = s.quiz_revision_id and quiz_id = quiz.id and status in ('published','archived') for share;
    if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
    -- No subset-of-a-quiz pass. All pinned module items must be in the session.
    if (select count(*) from public.quiz_revision_items where quiz_revision_id = module.id) <> s.question_count
      or exists (select 1 from public.quiz_revision_items i where i.quiz_revision_id = module.id
        and not exists (select 1 from public.learning_session_questions j where j.session_id = s.id and j.question_revision_id = i.question_revision_id)) then raise exception 'INVALID_SESSION'; end if;
  else
    -- Mixed practice has pinned question snapshots, but no pinned source-module
    -- column in 010. Only questions still in the live module are eligible.
    module := live_module;
  end if;
  if not exists (select 1 from public.quiz_revision_items where quiz_revision_id = module.id and question_revision_id = q.id)
    or ((module.access_tier = 'premium' or live_module.access_tier = 'premium') and not student.has_subscription) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if module.schema_version <> 1 or q.schema_version <> 1 or module.reward_policy_version <> s.reward_policy_version then raise exception 'INVALID_CONTENT'; end if;
  if (assistance->>'transcriptShown')::boolean and sq.type <> 'listening_choice' then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;
  if jsonb_typeof(q.presentation->'hints') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
  if exists (select 1 from jsonb_array_elements_text(assistance->'hintIds') h where not exists (
    select 1 from jsonb_array_elements(q.presentation->'hints') stored where stored->>'id' = h)) then raise exception 'INVALID_SUBMISSION' using errcode='22023'; end if;

  select * into k from public.quiz_question_keys where question_revision_id = q.id and type = sq.type;
  if not found then raise exception 'INVALID_CONTENT'; end if;
  answer_correct := public.grade_learning_response(sq.type, q.presentation, k.assessment, answer);
  if jsonb_typeof(k.feedback->'correctAnswerDisplay') is distinct from 'string'
    or jsonb_typeof(k.feedback#>'{explanation,en}') is distinct from 'string' then raise exception 'INVALID_CONTENT'; end if;
  -- Return only the feedback contract; never forward extra authoring fields.
  select jsonb_object_agg(key,value) into feedback from jsonb_each(k.feedback)
    where key in ('correctAnswerDisplay','explanation','pronunciation','example','cultureNote');
  if s.mode <> 'review' and totals.hearts = 0 then raise exception 'HEARTS_EMPTY' using errcode='P0003'; end if;
  heart_change := case when s.mode = 'review' and answer_correct then least(1,5-totals.hearts)
    when s.mode <> 'review' and not answer_correct then -1 else 0 end;
  select * into review from public.learning_review_state where user_id = student.id and question_id = q.question_id for update;
  due_review := found and s.mode = 'review' and sq.review_eligible and review.due_date <= today
    and (review.last_reviewed_at is null or (review.last_reviewed_at at time zone s.time_zone)::date < today);

  insert into public.learning_responses(id,session_question_id,session_id,user_id,type,idempotency_key,response,assistance,is_correct,score,feedback,hearts_delta)
    values(response_id,sq.id,s.id,student.id,sq.type,retry_key,answer,assistance,answer_correct,case when answer_correct then 1 else 0 end,feedback,heart_change);
  if answer_correct then
    source := case when due_review then 'review:' || q.question_id || ':' || review.due_date else 'answer:' || q.question_id || ':' || today end;
    insert into public.learning_reward_events(user_id,session_id,response_id,reason,source_key,xp)
      values(student.id,s.id,response_id,case when due_review then 'review_answer' else 'correct_answer' end,source,
        case when q.type = 'sentence_builder' then 20 else 10 end) on conflict(user_id,source_key) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then answer_xp := case when q.type = 'sentence_builder' then 20 else 10 end; end if;
  end if;
  if not answer_correct then
    insert into public.learning_review_state(user_id,question_id,last_question_revision_id,quiz_id,stage,misses,due_date)
      values(student.id,q.question_id,q.id,q.quiz_id,0,1,today)
      on conflict(user_id,question_id) do update set stage=0, misses=learning_review_state.misses+1,
        due_date=today,last_question_revision_id=q.id;
  elsif due_review then
    next_stage := least(review.stage+1,4);
    update public.learning_review_state set stage=next_stage,due_date=today+(array[1,3,7,21])[next_stage],
      last_reviewed_at=now(),last_question_revision_id=q.id where user_id=student.id and question_id=q.question_id;
  end if;

  select count(*),count(*) filter(where is_correct) into total_answers,correct_answers from public.learning_responses where session_id=s.id;
  finished := total_answers = s.question_count;
  if finished then
    passed := correct_answers*100 >= s.question_count*module.passing_score;
    if s.mode='lesson' and passed then
      insert into public.learning_reward_events(user_id,session_id,reason,source_key,coins)
        values(student.id,s.id,'lesson_completion','lesson:'||module.quiz_id,10) on conflict(user_id,source_key) do nothing;
      get diagnostics inserted = row_count;
      if inserted=1 then
        bonus_coins:=10;
        if correct_answers=s.question_count then
          insert into public.learning_reward_events(user_id,session_id,reason,source_key,xp)
            values(student.id,s.id,'perfect_completion','perfect:'||module.quiz_id,50);
          bonus_xp:=50;
        end if;
      end if;
    elsif s.mode='daily' then
      insert into public.learning_reward_events(user_id,session_id,reason,source_key,xp,coins)
        values(student.id,s.id,'daily_completion','daily:'||s.activity_date,50,10) on conflict(user_id,source_key) do nothing;
      get diagnostics inserted = row_count;
      if inserted=1 then bonus_xp:=50;bonus_coins:=10;end if;
    end if;
    update public.learning_sessions set status='completed',completed_at=now() where id=s.id;
  end if;
  update public.learning_totals set xp=xp+answer_xp+bonus_xp,coins=coins+bonus_coins,hearts=hearts+heart_change,
    answered=answered+1,correct=learning_totals.correct+case when answer_correct then 1 else 0 end,
    revision=revision+1,updated_at=now() where user_id=student.id returning * into totals;
  result := jsonb_build_object('responseId',response_id,'sessionQuestionId',sq.id,'isCorrect',answer_correct,'score',case when answer_correct then 1 else 0 end,
    'feedback',feedback,'reward',jsonb_build_object('xp',answer_xp+bonus_xp,'coins',bonus_coins,'heartsDelta',heart_change),
    'totals',jsonb_build_object('xp',totals.xp,'coins',totals.coins,'hearts',totals.hearts,'revision',totals.revision),
    'session',jsonb_build_object('completed',finished,'correct',correct_answers,'answered',total_answers,'total',s.question_count,
      'passed',case when finished and s.mode='lesson' then to_jsonb(passed) else 'null'::jsonb end),
    'rewardBreakdown',jsonb_build_object('answerXp',answer_xp,'completionXp',bonus_xp,'completionCoins',bonus_coins));
  update public.learning_responses set receipt=result where id=response_id;
  return result;
end $$;

revoke all on function public.gamification_normalize_fr(text), public.grade_learning_response(text,jsonb,jsonb,jsonb),
  public.submit_learning_answer(uuid,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_learning_answer(uuid,jsonb) to authenticated;
comment on function public.submit_learning_answer(uuid,jsonb) is 'Atomic authorized grading. Identity is auth.uid(); callers cannot submit correctness or reward values. Identical retries return the stored receipt.';
commit;
