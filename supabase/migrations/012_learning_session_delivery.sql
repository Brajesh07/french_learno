-- Authenticated, transactional session creation and presentation-only delivery.
-- Apply after 010 and 011. No changes to staff/auth routing or legacy quiz data.
begin;
alter table public.learning_sessions add column start_key uuid, add column start_request jsonb;
create unique index learning_sessions_start_key on public.learning_sessions(user_id,start_key) where start_key is not null;

-- Internal access check reused for delivery and media. Never client-callable.
create function public.learning_delivery_module(p_revision uuid) returns public.quiz_revisions
language plpgsql security definer set search_path = '' as $$
declare m public.quiz_revisions; live public.quiz_revisions; q public.quizzes; c public.courses; s public.profiles; t public.profiles; approval text;
begin
  select * into s from public.profiles where id=auth.uid() for share;
  if not found or s.role<>'student' or not s.is_active or s.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into m from public.quiz_revisions where id=p_revision;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  select * into q from public.quizzes where id=m.quiz_id;
  select * into t from public.profiles where id=q.created_by for share;
  select verification_status into approval from public.teacher_profiles where id=t.id for share;
  if t.id is null or t.role<>'teacher' or not t.is_active or t.must_change_password or approval is distinct from 'approved' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into q from public.quizzes where id=m.quiz_id for share;
  select * into c from public.courses where id=q.course_id for share;
  select * into live from public.quiz_revisions where quiz_id=q.id and status='published' for share;
  select * into m from public.quiz_revisions where id=p_revision for share;
  if c.id is null or not c.is_published or not q.is_published or c.created_by<>t.id or q.created_by<>t.id
    or live.id is null or m.status not in ('published','archived')
    or ((m.access_tier='premium' or live.access_tier='premium') and not s.has_subscription) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  return m;
end $$;

-- Whitelist every nested field; arbitrary authoring JSON never crosses the boundary.
create function public.learning_public_presentation(p jsonb,t text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare media_item jsonb; choices jsonb;
begin
 -- Fail closed on malformed scalar fields too. A nested object in a field
 -- intended to be text must never smuggle arbitrary authoring keys into a DTO.
 if jsonb_typeof(p#>'{prompt,en}') is distinct from 'string'
   or jsonb_typeof(p#>'{instructions,en}') is distinct from 'string'
   or jsonb_typeof(p->'interaction') is distinct from 'object'
   or jsonb_typeof(p->'hints') is distinct from 'array'
   or jsonb_typeof(p->'media') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
 if t in ('multiple_choice','listening_choice','sentence_builder') then
   choices:=case when t='sentence_builder' then p#>'{interaction,tokens}' else p#>'{interaction,options}' end;
   if jsonb_typeof(choices) is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
   if jsonb_array_length(choices) not between 2 and (case when t='sentence_builder' then 20 else 6 end)
     or exists(select 1 from jsonb_array_elements(choices) x where jsonb_typeof(x->'id') is distinct from 'string' or length(x->>'id') not between 1 and 100 or jsonb_typeof(x->'text') is distinct from 'string')
     or (select count(distinct x->>'id') from jsonb_array_elements(choices) x)<>jsonb_array_length(choices)
     or jsonb_typeof(case when t='sentence_builder' then p#>'{interaction,shuffleTokens}' else p#>'{interaction,shuffleOptions}' end) is distinct from 'boolean' then raise exception 'INVALID_CONTENT'; end if;
 elsif t='typed_recall' then
   if p#>>'{interaction,inputLanguage}' is distinct from 'fr-FR'
     or jsonb_typeof(p#>'{interaction,maxLength}') is distinct from 'number'
     or (p#>>'{interaction,maxLength}') !~ '^[1-9][0-9]{0,2}$'
     or jsonb_typeof(p#>'{interaction,characterPalette}') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
   if (p#>>'{interaction,maxLength}')::integer>500 or exists(select 1 from jsonb_array_elements(p#>'{interaction,characterPalette}') x where jsonb_typeof(x)<>'string') then raise exception 'INVALID_CONTENT'; end if;
 else raise exception 'INVALID_CONTENT'; end if;
 if jsonb_array_length(p->'hints')>3 or exists(select 1 from jsonb_array_elements(p->'hints') h
   where jsonb_typeof(h->'id') is distinct from 'string' or length(h->>'id') not between 1 and 100 or jsonb_typeof(h#>'{text,en}') is distinct from 'string') then raise exception 'INVALID_CONTENT'; end if;
 for media_item in select value from jsonb_array_elements(p->'media') loop
   if media_item->>'kind'='image' then
     if jsonb_typeof(media_item->'assetId') is distinct from 'string' or jsonb_typeof(media_item#>'{alt,en}') is distinct from 'string' then raise exception 'INVALID_CONTENT'; end if;
   elsif media_item->>'kind'='audio' then
     if media_item->>'locale' is distinct from 'fr-FR' or jsonb_typeof(media_item#>'{transcript,text}') is distinct from 'string' then raise exception 'INVALID_CONTENT'; end if;
     if media_item->>'source'='tts' then
       if jsonb_typeof(media_item->'text') is distinct from 'string' or jsonb_typeof(media_item->'rate') is distinct from 'number' then raise exception 'INVALID_CONTENT'; end if;
       if (media_item->>'rate')::numeric not between 0.5 and 1.5 then raise exception 'INVALID_CONTENT'; end if;
     elsif media_item->>'source'='asset' then
       if jsonb_typeof(media_item->'assetId') is distinct from 'string' then raise exception 'INVALID_CONTENT'; end if;
     else raise exception 'INVALID_CONTENT'; end if;
   else raise exception 'INVALID_CONTENT'; end if;
 end loop;
 if t='listening_choice' and p#>>'{media,0,kind}' is distinct from 'audio' then raise exception 'INVALID_CONTENT'; end if;
 return (select jsonb_build_object(
 'prompt',jsonb_build_object('en',p#>'{prompt,en}'),
 'instructions',jsonb_build_object('en',p#>'{instructions,en}'),
 'interaction',case when t in ('multiple_choice','listening_choice') then jsonb_build_object(
   'options',(select coalesce(jsonb_agg(jsonb_build_object('id',v->'id','text',v->'text')),'[]') from jsonb_array_elements(p#>'{interaction,options}') v),
   'shuffleOptions',p#>'{interaction,shuffleOptions}')
 when t='typed_recall' then jsonb_build_object('inputLanguage',p#>'{interaction,inputLanguage}','maxLength',p#>'{interaction,maxLength}',
   'characterPalette',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(p#>'{interaction,characterPalette}') v where jsonb_typeof(v)='string'))
 else jsonb_build_object('tokens',(select coalesce(jsonb_agg(jsonb_build_object('id',v->'id','text',v->'text')),'[]') from jsonb_array_elements(p#>'{interaction,tokens}') v),
   'shuffleTokens',p#>'{interaction,shuffleTokens}','allowTokenReturn',true) end,
 'hints',(select coalesce(jsonb_agg(jsonb_build_object('id',v->'id','text',jsonb_build_object('en',v#>'{text,en}'))),'[]') from jsonb_array_elements(p->'hints') v),
 'media',(select coalesce(jsonb_agg(case when v->>'kind'='image' then jsonb_build_object('kind','image','assetId',v->'assetId','alt',jsonb_build_object('en',v#>'{alt,en}'))
 else jsonb_build_object('kind','audio','source',v->'source','locale',v->'locale','transcript',jsonb_build_object('text',v#>'{transcript,text}','reveal','on_request')) ||
 case when v->>'source'='tts' then jsonb_build_object('text',v->'text','rate',v->'rate') else jsonb_build_object('assetId',v->'assetId') end end),'[]')
 from jsonb_array_elements(p->'media') v where v->>'kind' in ('audio','image'))));
end $$;

create function public.get_learning_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.learning_sessions; m public.quiz_revisions; item record; result jsonb:='[]'; totals jsonb;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='student' and is_active and not must_change_password) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  -- Use the same lock order as submit: profile, totals, session. A resume
  -- snapshot must not pair new receipts with totals read before their commit.
  perform 1 from public.profiles where id=auth.uid() for share;
  perform 1 from public.learning_totals where user_id=auth.uid() for update;
  select * into s from public.learning_sessions where id=p_session_id and user_id=auth.uid() for share;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if s.quiz_revision_id is not null then m:=public.learning_delivery_module(s.quiz_revision_id); end if;
  for item in select sq.id as session_question_id,sq.position,sq.display_order,q.* from public.learning_session_questions sq
    join public.quiz_question_revisions q on q.id=sq.question_revision_id where sq.session_id=s.id order by sq.position loop
    if s.quiz_revision_id is null then
      select r.* into m from public.quiz_revisions r join public.quiz_revision_items i on i.quiz_revision_id=r.id where r.status='published' and i.question_revision_id=item.id;
      if not found then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
      perform public.learning_delivery_module(m.id);
    end if;
    result:=result||jsonb_build_array(jsonb_build_object('id',item.session_question_id,'position',item.position,'displayOrder',item.display_order,
      'exercise',jsonb_build_object('questionId',item.question_id,'questionRevisionId',item.id,'contentRevision',item.content_revision,'schemaVersion',1,
      'type',item.type,'targetLanguage',item.target_language,'instructionLanguage',item.instruction_language,'proficiency',item.proficiency,
      'difficulty',item.difficulty,'skillIds',item.skill_ids,'tags',item.tags,'rewardClass',item.reward_class,
      'presentation',public.learning_public_presentation(item.presentation,item.type))));
  end loop;
  select jsonb_build_object('xp',xp,'coins',coins,'hearts',hearts,'revision',revision) into totals from public.learning_totals where user_id=auth.uid();
  return jsonb_build_object('id',s.id,'mode',s.mode,'status',s.status,'title',m.title,'timeZone',s.time_zone,'questions',result,
    'totals',coalesce(totals,'{"xp":0,"coins":0,"hearts":5,"revision":0}'),
    'receipts',(select coalesce(jsonb_agg(r.receipt order by sq.position),'[]') from public.learning_responses r join public.learning_session_questions sq on sq.id=r.session_question_id where r.session_id=s.id));
end $$;

create function public.start_learning_session(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare student public.profiles; m public.quiz_revisions; prior public.learning_sessions; sid uuid:=gen_random_uuid();
  mode text; key uuid; target uuid; selected uuid[]; item record; display jsonb; n integer:=0; today date:=(now() at time zone 'UTC')::date;
begin
  if jsonb_typeof(p_request) is distinct from 'object' or p_request - array['moduleId','courseId','mode','idempotencyKey'] <> '{}'::jsonb
    or not p_request ?& array['mode','idempotencyKey'] or (p_request ? 'moduleId')=(p_request ? 'courseId') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  mode:=p_request->>'mode'; key:=(p_request->>'idempotencyKey')::uuid; target:=coalesce(p_request->>'moduleId',p_request->>'courseId')::uuid;
  if key is null or target is null or mode is null or mode not in ('lesson','review','daily','words','listening') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  select * into student from public.profiles where id=auth.uid() for share;
  if not found or student.role<>'student' or not student.is_active or student.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  insert into public.learning_totals(user_id) values(student.id) on conflict do nothing;
  perform 1 from public.learning_totals where user_id=student.id for update;
  select * into prior from public.learning_sessions where user_id=student.id and start_key=key;
  if found then
    if prior.start_request<>p_request then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0003'; end if;
    return public.get_learning_session(prior.id);
  end if;
  -- moduleId is the stable quizzes.id, not a revision ID. Course selection is deterministic.
  select r.* into m from public.quiz_revisions r join public.quizzes q on q.id=r.quiz_id
    join public.courses c on c.id=q.course_id join public.profiles t on t.id=q.created_by join public.teacher_profiles tp on tp.id=t.id
    where r.status='published' and q.is_published and c.is_published and c.created_by=t.id
      and t.role='teacher' and t.is_active and not t.must_change_password and tp.verification_status='approved'
      and case when p_request ? 'moduleId' then q.id=target else q.course_id=target end
    order by (r.access_tier='premium' and not student.has_subscription), r.published_at,q.id limit 1;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  m:=public.learning_delivery_module(m.id);
  -- Locking the revision prevents a concurrent publication change during pinning.
  if m.status<>'published' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select array_agg(x.question_revision_id order by x.position) into selected from (
    select i.question_revision_id,i.position from public.quiz_revision_items i join public.quiz_question_revisions q on q.id=i.question_revision_id
    where i.quiz_revision_id=m.id and (mode<>'listening' or q.type='listening_choice')
      and (mode<>'words' or q.type in ('multiple_choice','typed_recall')) order by i.position
  ) x;
  if coalesce(cardinality(selected),0)=0 then raise exception 'NO_QUESTIONS' using errcode='P0002'; end if;
  if exists(select 1 from public.quiz_question_revisions q where q.id=any(selected) and (q.schema_version<>1 or not exists(select 1 from public.quiz_question_keys k where k.question_revision_id=q.id))) then raise exception 'INVALID_CONTENT'; end if;
  -- Full-module sessions retain their published revision; filtered practice uses
  -- the existing 011 live-membership rule. No arbitrary client-selected subsets.
  insert into public.learning_sessions(id,user_id,quiz_revision_id,mode,question_count,activity_date,time_zone,start_key,start_request)
    values(sid,student.id,case when mode in ('words','listening') then null else m.id end,mode,cardinality(selected),today,'UTC',key,p_request);
  for item in select q.*,i.position from public.quiz_revision_items i join public.quiz_question_revisions q on q.id=i.question_revision_id
    where i.quiz_revision_id=m.id and q.id=any(selected) order by i.position loop
    n:=n+1;
    select coalesce(jsonb_agg(v->'id' order by case when coalesce((item.presentation#>>'{interaction,shuffleOptions}')::boolean,(item.presentation#>>'{interaction,shuffleTokens}')::boolean,false) then gen_random_uuid() end,ord),'[]') into display
    from jsonb_array_elements(coalesce(item.presentation#>'{interaction,options}',item.presentation#>'{interaction,tokens}','[]')) with ordinality e(v,ord);
    insert into public.learning_session_questions(session_id,question_revision_id,type,position,display_order,review_eligible)
      values(sid,item.id,item.type,n,display,mode='review' and exists(select 1 from public.learning_review_state where user_id=student.id and question_id=item.question_id and due_date<=today));
  end loop;
  return public.get_learning_session(sid);
end $$;

create function public.get_learning_catalogue() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.profiles; modules jsonb; totals jsonb;
begin
  select * into s from public.profiles where id=auth.uid();
  if not found or s.role<>'student' or not s.is_active or s.must_change_password then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',r.quiz_id,'revisionId',r.id,'courseId',c.id,'courseTitle',c.title,'title',r.title,'objective',r.objective,
    'proficiency',r.proficiency,'accessTier',r.access_tier,'locked',r.access_tier='premium' and not s.has_subscription,
    'questionCount',(select count(*) from public.quiz_revision_items where quiz_revision_id=r.id),
    'types',(select jsonb_agg(distinct qr.type) from public.quiz_revision_items i join public.quiz_question_revisions qr on qr.id=i.question_revision_id where i.quiz_revision_id=r.id),
    'completed',exists(select 1 from public.learning_reward_events where user_id=s.id and source_key='lesson:'||r.quiz_id),
    'dueReviews',(select count(*) from public.learning_review_state rs join public.quiz_revision_items i on i.question_id=rs.question_id where rs.user_id=s.id and i.quiz_revision_id=r.id and rs.due_date<=(now() at time zone 'UTC')::date)
  ) order by r.published_at,r.quiz_id),'[]') into modules
  from public.quiz_revisions r join public.quizzes q on q.id=r.quiz_id join public.courses c on c.id=q.course_id
  join public.profiles t on t.id=q.created_by join public.teacher_profiles tp on tp.id=t.id
  where r.status='published' and q.is_published and c.is_published and c.created_by=t.id and t.role='teacher' and t.is_active and not t.must_change_password and tp.verification_status='approved';
  select jsonb_build_object('xp',xp,'coins',coins,'hearts',hearts,'revision',revision) into totals from public.learning_totals where user_id=s.id;
  return jsonb_build_object('modules',modules,'totals',coalesce(totals,'{"xp":0,"coins":0,"hearts":5,"revision":0}'),
   'activeSessions',(select coalesce(jsonb_agg(x),'[]') from (select id,mode,created_at as "createdAt" from public.learning_sessions where user_id=s.id and status='active' order by created_at desc limit 10) x),
   'completedSessions',(select count(*) from public.learning_sessions where user_id=s.id and status='completed'),
   'days',(select coalesce(jsonb_agg(d),'[]') from (select distinct (completed_at at time zone 'UTC')::date d from public.learning_sessions where user_id=s.id and status='completed') dates),'timeZone','UTC');
end $$;

create function public.get_learning_session_asset(p_session_id uuid,p_asset_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.learning_assets;
begin
  -- Revalidate ownership and current entitlement before issuing a short-lived URL.
  perform public.get_learning_session(p_session_id);
  select asset.* into a from public.learning_assets asset where asset.id=p_asset_id and asset.status='ready' and exists(
    select 1 from public.learning_session_questions sq join public.quiz_question_assets qa on qa.question_revision_id=sq.question_revision_id
    where sq.session_id=p_session_id and qa.asset_id=asset.id and (qa.usage='presentation' or exists(select 1 from public.learning_responses where session_question_id=sq.id)));
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  return jsonb_build_object('bucket',a.bucket_id,'path',a.storage_path);
end $$;
revoke all on function public.learning_delivery_module(uuid),public.learning_public_presentation(jsonb,text),public.get_learning_session(uuid),public.start_learning_session(jsonb),public.get_learning_catalogue(),public.get_learning_session_asset(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_learning_session(uuid),public.start_learning_session(jsonb),public.get_learning_catalogue(),public.get_learning_session_asset(uuid,uuid) to authenticated;
commit;
