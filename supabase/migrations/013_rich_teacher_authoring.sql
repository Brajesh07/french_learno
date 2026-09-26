-- Rich authoring uses validated server requests and atomic service-only RPCs.
-- Apply after 012. Existing published/student snapshots are never overwritten.
begin;
-- Keep rich modules out of the legacy MCQ renderer/submission path.
alter table public.quizzes add column learning_runtime text not null default 'legacy' check(learning_runtime in ('legacy','gamified'));
update public.quizzes q set learning_runtime='gamified' where exists(select 1 from public.quiz_revisions r where r.quiz_id=q.id);
alter table public.quiz_revisions add column edit_version integer not null default 1 check(edit_version>0);
create table public.teacher_revision_writes (
  teacher_id uuid not null references public.profiles(id), mutation_id uuid not null,
  fingerprint text not null, receipt jsonb not null, created_at timestamptz not null default now(),
  primary key(teacher_id,mutation_id)
);
alter table public.teacher_revision_writes enable row level security;
revoke all on public.teacher_revision_writes from public,anon,authenticated,service_role;

create function public.write_teacher_revision(p_teacher_id uuid,p_action text,p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
<<author>>
declare teacher public.profiles; approval text; course public.courses; quiz public.quizzes; rev public.quiz_revisions;
  doc jsonb; item jsonb; asset jsonb; asset_usage text; question_id uuid; question_revision_id uuid;
  position integer:=0; content_version integer; latest uuid; mutation uuid; fingerprint text; prior public.teacher_revision_writes; result jsonb;
begin
  -- Only service_role may execute. p_teacher_id comes from verified cookies in
  -- the API, never a caller-controlled field. Recheck and lock against rejection.
  select * into teacher from public.profiles where id=p_teacher_id for share;
  select verification_status into approval from public.teacher_profiles where id=p_teacher_id for share;
  if teacher.id is null or teacher.role<>'teacher' or not teacher.is_active or teacher.must_change_password or approval is distinct from 'approved' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  -- Serialize save/publish requests per teacher, including first-time creation.
  perform pg_advisory_xact_lock(hashtextextended('rich-author:'||p_teacher_id,0));
  if p_action not in ('save','publish') or p_action is null or jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text)>2097152 then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  mutation:=(p_request->>'mutationId')::uuid;
  if mutation is null then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  fingerprint:=encode(sha256(convert_to(p_action||p_request::text,'UTF8')),'hex');
  select * into prior from public.teacher_revision_writes where teacher_id=p_teacher_id and mutation_id=mutation;
  if found then
    if prior.fingerprint<>fingerprint then raise exception 'MUTATION_CONFLICT' using errcode='40001'; end if;
    return prior.receipt;
  end if;
  if p_action='save' then
    doc:=p_request->'document';
    if doc->>'schemaVersion'<>'1' or jsonb_typeof(doc->'questions') is distinct from 'array' or jsonb_array_length(doc->'questions') not between 1 and 50 then raise exception 'INVALID_DOCUMENT' using errcode='22023'; end if;
    select * into course from public.courses where id=(doc->>'courseId')::uuid and created_by=p_teacher_id for share;
    if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
    if p_request->>'moduleId' is null then
      if p_request->>'baseRevisionId' is not null or (p_request->>'expectedVersion')::integer<>0 then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
      insert into public.quizzes(title,course_id,created_by,is_published,learning_runtime) values(doc->>'title',course.id,p_teacher_id,false,'gamified') returning * into quiz;
      insert into public.quiz_revisions(quiz_id,revision,title,objective) values(quiz.id,1,doc->>'title',doc->>'objective') returning * into rev;
    else
      select * into quiz from public.quizzes where id=(p_request->>'moduleId')::uuid and created_by=p_teacher_id for update;
      if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
      -- A module's course is stable once established. Moving would alter access
      -- for existing pinned sessions, so authors should create a new module.
      if quiz.course_id is distinct from course.id then raise exception 'COURSE_IMMUTABLE' using errcode='22023'; end if;
      select id into latest from public.quiz_revisions where quiz_id=quiz.id order by revision desc limit 1;
      select * into rev from public.quiz_revisions where id=(p_request->>'baseRevisionId')::uuid and quiz_id=quiz.id for update;
      if not found or rev.id is distinct from latest or rev.edit_version is distinct from (p_request->>'expectedVersion')::integer or rev.status='archived' then raise exception 'STALE_REVISION' using errcode='40001'; end if;
      if rev.status='published' then
        insert into public.quiz_revisions(quiz_id,revision,title,objective) values(quiz.id,rev.revision+1,doc->>'title',doc->>'objective') returning * into rev;
      else
        update public.quiz_revisions set edit_version=edit_version+1 where id=rev.id returning * into rev;
        delete from public.quiz_revision_items where quiz_revision_id=rev.id;
      end if;
    end if;
    update public.quiz_revisions set title=doc->>'title',description=doc->>'description',objective=doc->>'objective',kind=doc->>'kind',
      proficiency=doc->>'proficiency',access_tier=doc->>'accessTier',passing_score=(doc->>'passingScore')::integer where id=rev.id;
    for item in select value from jsonb_array_elements(doc->'questions') loop
      position:=position+1; question_id:=(item->>'questionId')::uuid;
      if exists(select 1 from public.quiz_questions where id=question_id and quiz_id<>quiz.id) then raise exception 'FOREIGN_QUESTION' using errcode='42501'; end if;
      -- Legacy rows are lineage anchors only, never an alternate grading store.
      insert into public.quiz_questions(id,quiz_id,question,type,points) values(question_id,quiz.id,'Interactive exercise','mcq',1) on conflict(id) do nothing;
      select coalesce(max(content_revision),0)+1 into content_version from public.quiz_question_revisions where quiz_question_revisions.question_id=author.question_id;
      perform public.learning_public_presentation(item->'presentation',item->>'type');
      insert into public.quiz_question_revisions(question_id,quiz_id,content_revision,type,proficiency,reward_class,presentation)
        values(question_id,quiz.id,content_version,item->>'type',doc->>'proficiency',case when item->>'type'='sentence_builder' then 'builder' else 'standard' end,item->'presentation') returning id into question_revision_id;
      insert into public.quiz_question_keys(question_revision_id,type,assessment,feedback) values(question_revision_id,item->>'type',item->'assessment',item->'feedback');
      -- Explicit media links preserve storage ownership and delivery authorization.
      for asset,asset_usage in
        select value,'presentation' from jsonb_array_elements(item#>'{presentation,media}') where value ? 'assetId'
        union all select item#>'{feedback,pronunciation,audio}','feedback' where item#>>'{feedback,pronunciation,audio,source}'='asset'
      loop
        perform 1 from public.learning_assets where id=(asset->>'assetId')::uuid and owner_id=p_teacher_id and status='ready'
          and kind=case when asset->>'kind'='image' then 'image' else 'audio' end for share;
        if not found then raise exception 'ASSET_UNAVAILABLE' using errcode='22023'; end if;
        insert into public.quiz_question_assets values(question_revision_id,(asset->>'assetId')::uuid,asset_usage) on conflict do nothing;
      end loop;
      insert into public.quiz_revision_items values(rev.id,quiz.id,question_id,question_revision_id,position);
    end loop;
    -- Draft edits do not change the live title or publication state.
    if not quiz.is_published then update public.quizzes set title=doc->>'title',description=doc->>'description' where id=quiz.id; end if;
  else
    -- Lock order matches saves: teacher, course, quiz, revision.
    select * into quiz from public.quizzes where id=(p_request->>'moduleId')::uuid and created_by=p_teacher_id;
    if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
    select * into course from public.courses where id=quiz.course_id and created_by=p_teacher_id for share;
    if not found or not course.is_published then raise exception 'PUBLISH_COURSE_FIRST' using errcode='22023'; end if;
    perform 1 from public.quizzes where id=quiz.id for update;
    select * into rev from public.quiz_revisions where id=(p_request->>'revisionId')::uuid and quiz_id=quiz.id for update;
    if not found or rev.status<>'draft' or rev.edit_version is distinct from (p_request->>'expectedVersion')::integer then raise exception 'STALE_REVISION' using errcode='40001'; end if;
    if not exists(select 1 from public.quiz_revision_items where quiz_revision_id=rev.id) then raise exception 'EMPTY_MODULE' using errcode='22023'; end if;
    -- API validates the entire persisted document before this RPC; version check
    -- prevents a different draft from being swapped between validation and commit.
    update public.quiz_revisions set status='archived' where quiz_id=quiz.id and status='published';
    update public.quiz_revisions set status='published',published_at=now() where id=rev.id returning * into rev;
    update public.quizzes set title=rev.title,description=rev.description,passing_score=rev.passing_score,is_published=true where id=quiz.id;
  end if;
  result:=jsonb_build_object('moduleId',quiz.id,'revisionId',rev.id,'editVersion',rev.edit_version,'status',rev.status);
  insert into public.teacher_revision_writes values(p_teacher_id,mutation,fingerprint,result,now());
  return result;
end $$;
revoke all on function public.write_teacher_revision(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.write_teacher_revision(uuid,text,jsonb) to service_role;
commit;
