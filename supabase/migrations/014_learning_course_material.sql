-- Course theory delivery uses the same live entitlement as session creation.
-- Course material is shared by every module in that course; do not put
-- premium-only theory in a course that also contains free modules.
begin;

create function public.get_learning_material(p_module_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare revision_id uuid; m public.quiz_revisions; c public.courses;
begin
  if not exists (select 1 from public.profiles where id=auth.uid()
    and role='student' and is_active and not must_change_password) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  select id into revision_id from public.quiz_revisions
    where quiz_id=p_module_id and status='published';
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  -- Checks student subscription, course publication and teacher approval,
  -- and holds the same row locks as exercise delivery until commit.
  m := public.learning_delivery_module(revision_id);
  select courses.* into c from public.courses
    join public.quizzes on quizzes.course_id=courses.id where quizzes.id=m.quiz_id;
  -- Explicit allowlist: no question keys, assessment or grading feedback.
  return jsonb_build_object(
    'moduleId',m.quiz_id,'revisionId',m.id,'title',m.title,
    'objective',m.objective,'description',m.description,
    'courseId',c.id,'courseTitle',c.title,'courseDescription',c.description,
    'text',c.content_text,'imageUrl',c.content_image_url,
    'audioUrl',c.content_audio_url,'videoUrl',c.content_video_url);
end $$;

revoke all on function public.get_learning_material(uuid) from public, anon, authenticated;
grant execute on function public.get_learning_material(uuid) to authenticated;
commit;
