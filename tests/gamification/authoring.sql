-- The runner prepends the four-type fixtures from submission.sql.
create function pg_temp.rich_document() returns jsonb language sql as $$
 select jsonb_build_object('schemaVersion',1,'courseId','21000000-0000-4000-8000-000000000001','title','Rich fixture','description','','objective','Learn four ways','kind','lesson','proficiency','A1','accessTier','free','passingScore',70,
 'questions',(select jsonb_agg(jsonb_build_object('questionId',gen_random_uuid(),'type',q.type,'presentation',q.presentation,'assessment',k.assessment,'feedback',k.feedback) order by q.id)
 from public.quiz_question_revisions q join public.quiz_question_keys k on k.question_revision_id=q.id where q.quiz_id='31000000-0000-4000-8000-000000000001'));
$$;
create temp table authoring_test_state (receipt jsonb, document jsonb, session jsonb);
grant all on authoring_test_state to authenticated,service_role;
-- Service-role invocation simulates the API after cookie identity validation.
set local role service_role;
do $$ declare doc jsonb:=pg_temp.rich_document(); request jsonb; saved jsonb; changed jsonb; published jsonb; begin
  if has_function_privilege('authenticated','public.write_teacher_revision(uuid,text,jsonb)','EXECUTE') or has_function_privilege('anon','public.write_teacher_revision(uuid,text,jsonb)','EXECUTE') then raise exception 'FAIL direct RPC exposure'; end if;
  request:=jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',null,'baseRevisionId',null,'expectedVersion',0,'document',doc);
  begin perform public.write_teacher_revision('11000000-0000-4000-8000-000000000001','save',request); raise exception 'FAIL student author'; exception when insufficient_privilege then null; end;
  saved:=public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',request);
  if saved<>public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',request) then raise exception 'FAIL save idempotency'; end if;
  if saved->>'status'<>'draft' or (select count(*) from public.quiz_revision_items where quiz_revision_id=(saved->>'revisionId')::uuid)<>4 then raise exception 'FAIL draft items'; end if;
  if (select is_published from public.quizzes where id=(saved->>'moduleId')::uuid) then raise exception 'FAIL draft publication'; end if;
  begin perform public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',jsonb_set(request,'{document,title}','"Changed key"')); raise exception 'FAIL mutation conflict'; exception when serialization_failure then null; end;
  request:=jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',saved->>'moduleId','baseRevisionId',saved->>'revisionId','expectedVersion',1,'document',doc);
  changed:=public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',request);
  if changed->>'editVersion'<>'2' then raise exception 'FAIL edit version'; end if;
  if (select count(*) from public.quiz_question_revisions where quiz_id=(saved->>'moduleId')::uuid)<>8 then raise exception 'FAIL append-only questions'; end if;
  begin perform public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',jsonb_set(request,'{mutationId}',to_jsonb(gen_random_uuid()))); raise exception 'FAIL stale write'; exception when serialization_failure then null; end;
  request:=jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',changed->>'moduleId','revisionId',changed->>'revisionId','expectedVersion',2);
  published:=public.write_teacher_revision('11000000-0000-4000-8000-000000000003','publish',request);
  if published->>'status'<>'published' or published<>public.write_teacher_revision('11000000-0000-4000-8000-000000000003','publish',request) then raise exception 'FAIL publish/retry'; end if;
  insert into authoring_test_state values(published,doc,null);
  raise notice 'PASS draft/save/retry/conflict/publication';
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare state authoring_test_state; s jsonb; r jsonb; q jsonb; response jsonb; i integer; begin
  select * into state from authoring_test_state;
  if (select count(*) from public.quiz_question_keys)<>0 then raise exception 'FAIL private assessment RLS'; end if;
  s:=public.start_learning_session(jsonb_build_object('moduleId',state.receipt->>'moduleId','mode','lesson','idempotencyKey',gen_random_uuid()));
  if jsonb_array_length(s->'questions')<>4 or s::text ~ 'assessment|acceptedAnswers|correctOptionId' then raise exception 'FAIL student delivery'; end if;
  for i in 0..3 loop
    q:=s->'questions'->i;
    response:=case i when 0 then '{"optionId":"a"}'::jsonb when 1 then '{"text":"café"}' when 2 then '{"tokenIds":["x","y"]}' else '{"optionId":"a"}' end;
    r:=public.submit_learning_answer((s->>'id')::uuid,jsonb_build_object('schemaVersion',1,'sessionId',s->>'id','sessionQuestionId',q->>'id','idempotencyKey',gen_random_uuid(),'type',q#>>'{exercise,type}','response',response,'assistance','{"hintIds":[],"transcriptShown":false}'::jsonb));
  end loop;
  if r#>>'{session,completed}'<>'true' or r#>>'{session,correct}'<>'4' then raise exception 'FAIL rich published grading'; end if;
  update authoring_test_state set session=s;
  raise notice 'PASS author -> publish -> student session -> four secure graders';
end $$;
reset role;
set local role service_role;
do $$ declare state authoring_test_state; request jsonb; draft jsonb; begin
  select * into state from authoring_test_state;
  request:=jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',state.receipt->>'moduleId','baseRevisionId',state.receipt->>'revisionId','expectedVersion',2,'document',state.document);
  draft:=public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',request);
  if draft->>'revisionId'=state.receipt->>'revisionId' or (select status from public.quiz_revisions where id=(state.receipt->>'revisionId')::uuid)<>'published' then raise exception 'FAIL live preservation'; end if;
  perform public.write_teacher_revision('11000000-0000-4000-8000-000000000003','publish',jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',draft->>'moduleId','revisionId',draft->>'revisionId','expectedVersion',1));
  if (select status from public.quiz_revisions where id=(state.receipt->>'revisionId')::uuid)<>'archived' then raise exception 'FAIL archive'; end if;
  if (select count(*) from public.quiz_revisions where quiz_id=(draft->>'moduleId')::uuid and status='published')<>1 then raise exception 'FAIL single live revision'; end if;
  update authoring_test_state set receipt=draft;
  raise notice 'PASS immutable published revision replacement';
end $$;
reset role;
-- Rollback after a late invalid asset must not leave a partial module or keys.
do $$ declare doc jsonb:=pg_temp.rich_document(); n integer; begin
  select count(*) into n from public.quiz_revisions;
  doc:=jsonb_set(doc,'{questions,3,presentation,media}', '[{"kind":"audio","source":"asset","assetId":"99000000-0000-4000-8000-000000000001","locale":"fr-FR","transcript":{"text":"Bonjour","reveal":"on_request"}}]');
  begin perform public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save',jsonb_build_object('mutationId',gen_random_uuid(),'moduleId',null,'baseRevisionId',null,'expectedVersion',0,'document',doc)); raise exception 'FAIL missing asset'; exception when invalid_parameter_value then null; end;
  if (select count(*) from public.quiz_revisions)<>n then raise exception 'FAIL atomic rollback'; end if;
  raise notice 'PASS rollback on invalid asset';
end $$;
update public.teacher_profiles set verification_status='rejected' where id='11000000-0000-4000-8000-000000000003';
set local role service_role;
do $$ begin
  begin perform public.write_teacher_revision('11000000-0000-4000-8000-000000000003','save','{}'); raise exception 'FAIL revoked teacher'; exception when insufficient_privilege then null; end;
  raise notice 'PASS teacher revocation';
end $$;
reset role;
