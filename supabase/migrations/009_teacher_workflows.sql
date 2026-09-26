begin;

-- Public signup is mediated by the server. No caller-selected role/status.
create function public.provision_teacher(p_user_id uuid, p_name text, p_username text, p_bio text, p_expertise text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_email text;
begin
  select email into strict account_email from auth.users where id = p_user_id;
  insert into public.profiles (id, name, username, email, role)
    values (p_user_id, p_name, p_username, account_email, 'teacher');
  insert into public.teacher_profiles (id, bio, expertise, verification_status)
    values (p_user_id, p_bio, p_expertise, 'pending');
end;
$$;
revoke all on function public.provision_teacher(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.provision_teacher(uuid,text,text,text,text) to service_role;

-- Durable public-signup throttling: one global and one hashed-email bucket.
create table public.teacher_signup_limits (bucket text primary key, started_at timestamptz not null, attempts integer not null);
alter table public.teacher_signup_limits enable row level security;
revoke all on public.teacher_signup_limits from public, anon, authenticated;
create function public.reserve_teacher_signup(p_email_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare k text; n integer;
begin
  foreach k in array array['global', p_email_hash] loop
    insert into public.teacher_signup_limits values (k, now(), 1)
      on conflict (bucket) do update set
        attempts = case when teacher_signup_limits.started_at < now() - interval '1 hour' then 1 else teacher_signup_limits.attempts + 1 end,
        started_at = case when teacher_signup_limits.started_at < now() - interval '1 hour' then now() else teacher_signup_limits.started_at end
      returning attempts into n;
    if n > (case when k = 'global' then 60 else 5 end) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.reserve_teacher_signup(text) from public, anon, authenticated;
grant execute on function public.reserve_teacher_signup(text) to service_role;

-- Status transition and audit entry commit together. Expected status prevents
-- one admin from silently overwriting a decision made in another browser.
create function public.review_teacher(p_teacher_id uuid, p_expected text, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare existing_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') or p_decision is null then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  select tp.verification_status into existing_status
    from public.teacher_profiles tp join public.profiles p on p.id = tp.id
    where tp.id = p_teacher_id and p.role = 'teacher' for update of tp, p;
  if not found then raise exception 'Teacher not found' using errcode = 'P0002'; end if;
  if existing_status is distinct from p_expected then raise exception 'Teacher changed; refresh and retry' using errcode = '40001'; end if;
  update public.teacher_profiles set verification_status = p_decision,
    reviewed_by = auth.uid(), reviewed_at = now() where id = p_teacher_id;
  if p_decision = 'rejected' then
    update public.courses set is_published = false where created_by = p_teacher_id;
    update public.quizzes set is_published = false where created_by = p_teacher_id;
  end if;
  insert into public.admin_audit_log(actor_id, action, target_id)
    values (auth.uid(), 'teacher_' || p_decision, p_teacher_id);
end;
$$;
revoke all on function public.review_teacher(uuid,text,text) from public, anon;
grant execute on function public.review_teacher(uuid,text,text) to authenticated;

-- Database-level removal of admin authoring. Mutations below go through narrow
-- RPCs that derive ownership from auth.uid(), never a submitted user ID.
drop policy "Admins have full access to courses" on public.courses;
drop policy "Admins have full access to quizzes" on public.quizzes;
drop policy "Admins have full access to quiz_questions" on public.quiz_questions;
drop policy "Admins have full access to quiz_answers" on public.quiz_answers;
create policy "Admins read courses" on public.courses for select to authenticated using (public.is_admin());
create policy "Admins read quizzes" on public.quizzes for select to authenticated using (public.is_admin());
create policy "Admins read questions" on public.quiz_questions for select to authenticated using (public.is_admin());
create policy "Admins read answers" on public.quiz_answers for select to authenticated using (public.is_admin());
revoke insert, update, delete, truncate, references, trigger on public.courses, public.quizzes, public.quiz_questions, public.quiz_answers from public, anon, authenticated;
drop policy "Approved teachers can insert own courses" on public.courses;
drop policy "Approved teachers can update own courses" on public.courses;
drop policy "Approved teachers can insert own quizzes" on public.quizzes;
drop policy "Approved teachers can update own quizzes" on public.quizzes;

create function public.owns_quiz(p_quiz_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_approved_teacher(), false) and exists (
    select 1 from public.quizzes where id = p_quiz_id and created_by = auth.uid());
$$;
revoke all on function public.owns_quiz(uuid) from public, anon;
grant execute on function public.owns_quiz(uuid) to authenticated;
create policy "Teachers read owned quiz questions" on public.quiz_questions for select to authenticated
  using (public.owns_quiz(quiz_id));
create policy "Teachers read owned quiz answers" on public.quiz_answers for select to authenticated
  using (exists (select 1 from public.quiz_questions q where q.id = question_id and public.owns_quiz(q.quiz_id)));

-- Serialize authoring with teacher review so rejection cannot race a publish.
create function public.lock_approved_teacher()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles p join public.teacher_profiles tp on p.id = tp.id
    where p.id = auth.uid() and p.role = 'teacher' and p.is_active
      and not p.must_change_password and tp.verification_status = 'approved'
    for share of p, tp;
  if not found then raise exception 'Approved teacher required' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.lock_approved_teacher() from public, anon, authenticated;

create function public.save_teacher_course(p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  perform public.lock_approved_teacher();
  if coalesce(length(btrim(p_data->>'title')), 0) not between 1 and 200
    or coalesce(p_data->>'level', '') not in ('A1', 'B1', 'B2')
    or octet_length(p_data::text) > 262144 then
    raise exception 'Invalid course' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.courses (title, level, created_by)
      values (btrim(p_data->>'title'), p_data->>'level', auth.uid()) returning id into saved_id;
  else
    select id into saved_id from public.courses where id = p_id and created_by = auth.uid() for update;
    if not found then raise exception 'Course not found' using errcode = 'P0002'; end if;
  end if;
  update public.courses set title = btrim(p_data->>'title'), description = p_data->>'description',
    level = p_data->>'level', content_text = p_data#>>'{content,text}',
    content_image_url = p_data#>>'{content,imageUrl}', content_audio_url = p_data#>>'{content,audioUrl}',
    content_video_url = p_data#>>'{content,videoUrl}', is_published = coalesce((p_data->>'isPublished')::boolean, false)
    where id = saved_id;
  return saved_id;
end;
$$;
revoke all on function public.save_teacher_course(uuid,jsonb) from public, anon;
grant execute on function public.save_teacher_course(uuid,jsonb) to authenticated;

create function public.save_teacher_quiz(p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; question_id uuid; q jsonb; a jsonb; course_uuid uuid; score integer;
begin
  perform public.lock_approved_teacher();
  course_uuid := (p_data->>'course_id')::uuid;
  score := coalesce((p_data->>'passing_score')::integer, 70);
  if coalesce(length(btrim(p_data->>'title')), 0) not between 1 and 200
    or score not between 0 and 100 or jsonb_typeof(p_data->'questions') is distinct from 'array'
    or jsonb_array_length(p_data->'questions') not between 1 and 100
    or octet_length(p_data::text) > 262144 then
    raise exception 'Invalid quiz' using errcode = '22023';
  end if;
  perform 1 from public.courses where id = course_uuid and created_by = auth.uid() for share;
  if not found then raise exception 'Choose one of your courses' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.quizzes (title, course_id, created_by)
      values (btrim(p_data->>'title'), course_uuid, auth.uid()) returning id into saved_id;
  else
    select id into saved_id from public.quizzes where id = p_id and created_by = auth.uid() for update;
    if not found then raise exception 'Quiz not found' using errcode = 'P0002'; end if;
    -- Existing attempts must never be erased by replacing their questions.
    if exists (select 1 from public.quiz_attempts where quiz_id = saved_id) then
      raise exception 'This quiz has attempts. Create a new quiz to preserve student history.' using errcode = '22023';
    end if;
    delete from public.quiz_questions where quiz_id = saved_id;
  end if;
  update public.quizzes set title = btrim(p_data->>'title'), description = p_data->>'description',
    course_id = course_uuid, passing_score = score, is_published = coalesce((p_data->>'is_published')::boolean, false)
    where id = saved_id;
  for q in select value from jsonb_array_elements(p_data->'questions') loop
    if coalesce(length(btrim(q->>'question')), 0) not between 1 and 10000
      or jsonb_typeof(q->'answers') is distinct from 'array'
      or jsonb_array_length(q->'answers') not between 2 and 10
      or coalesce((q->>'points')::integer, 1) not between 1 and 100 then
      raise exception 'Invalid question' using errcode = '22023';
    end if;
    if (select count(*) from jsonb_array_elements(q->'answers') x where x->>'is_correct' = 'true') <> 1 then
      raise exception 'Select exactly one correct answer per question' using errcode = '22023';
    end if;
    insert into public.quiz_questions (quiz_id, question, type, points, explanation)
      values (saved_id, btrim(q->>'question'), 'mcq', coalesce((q->>'points')::integer, 1), q->>'explanation')
      returning id into question_id;
    for a in select value from jsonb_array_elements(q->'answers') loop
      if coalesce(length(btrim(a->>'answer')), 0) not between 1 and 2000 then
        raise exception 'Invalid answer' using errcode = '22023';
      end if;
      insert into public.quiz_answers (question_id, answer, is_correct)
        values (question_id, btrim(a->>'answer'), coalesce((a->>'is_correct')::boolean, false));
    end loop;
  end loop;
  return saved_id;
end;
$$;
revoke all on function public.save_teacher_quiz(uuid,jsonb) from public, anon;
grant execute on function public.save_teacher_quiz(uuid,jsonb) to authenticated;

commit;
