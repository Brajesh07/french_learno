-- Standard four-type fixtures are supplied by delivery-database.mjs.
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
create function pg_temp.start_request(mode text default 'lesson', k uuid default gen_random_uuid()) returns jsonb language sql as $$
 select jsonb_build_object('moduleId','31000000-0000-4000-8000-000000000001','mode',mode,'idempotencyKey',k);
$$;
do $$ declare p jsonb; s jsonb; again jsonb; receipt jsonb; q jsonb; i int; response jsonb; seen integer; begin
  if has_function_privilege('authenticated','public.learning_delivery_module(uuid)','EXECUTE') or has_function_privilege('anon','public.start_learning_session(jsonb)','EXECUTE') then raise exception 'FAIL internal privileges'; end if;
  if jsonb_array_length(public.get_learning_catalogue()->'modules')<>1 then raise exception 'FAIL catalogue'; end if;
  begin perform public.start_learning_session(pg_temp.start_request()||'{"xp":100}'); raise exception 'FAIL forged fields'; exception when invalid_parameter_value then null; end;
  begin perform public.start_learning_session(pg_temp.start_request()||'{"courseId":"21000000-0000-4000-8000-000000000001"}'); raise exception 'FAIL ambiguous target'; exception when invalid_parameter_value then null; end;
  begin perform public.start_learning_session(pg_temp.start_request('invented')); raise exception 'FAIL mode'; exception when invalid_parameter_value then null; end;
  p:=pg_temp.start_request(); s:=public.start_learning_session(p); again:=public.start_learning_session(p);
  if s<>again or jsonb_array_length(s->'questions')<>4 or s->>'timeZone'<>'UTC' then raise exception 'FAIL pinned start/retry'; end if;
  select count(*) into seen from public.learning_sessions where start_key=(p->>'idempotencyKey')::uuid;
  if seen<>1 then raise exception 'FAIL duplicate start'; end if;
  if s::text ~ 'assessment|correctOptionId|acceptedAnswers|acceptedSequences|correctAnswerDisplay' then raise exception 'FAIL private content'; end if;
  if jsonb_array_length(s#>'{questions,0,displayOrder}')<>2 or s#>'{questions,1,displayOrder}'<>'[]'::jsonb then raise exception 'FAIL display order'; end if;
  begin perform public.start_learning_session(p||'{"mode":"daily"}'); raise exception 'FAIL changed retry'; exception when sqlstate 'P0003' then if sqlerrm<>'IDEMPOTENCY_CONFLICT' then raise; end if; end;
  if (select count(*) from public.quiz_question_keys)<>0 then raise exception 'FAIL private RLS'; end if;
  for i in 0..3 loop
    q:=s->'questions'->i;
    response:=case i when 0 then '{"optionId":"a"}'::jsonb when 1 then '{"text":"café"}' when 2 then '{"tokenIds":["x","y"]}' else '{"optionId":"a"}' end;
    receipt:=public.submit_learning_answer((s->>'id')::uuid,jsonb_build_object('schemaVersion',1,'sessionId',s->>'id','sessionQuestionId',q->>'id','idempotencyKey',gen_random_uuid(),'type',q#>>'{exercise,type}','response',response,'assistance','{"hintIds":[],"transcriptShown":false}'::jsonb));
    again:=public.get_learning_session((s->>'id')::uuid);
    if jsonb_array_length(again->'receipts')<>i+1 or again->'totals'<>receipt->'totals' then raise exception 'FAIL coherent resume'; end if;
  end loop;
  if again->>'status'<>'completed' or receipt#>>'{totals,xp}'<>'100' or receipt#>>'{totals,coins}'<>'10' then raise exception 'FAIL trusted full loop: %',receipt; end if;
  if public.start_learning_session(p)->>'id'<>s->>'id' then raise exception 'FAIL completed start retry'; end if;
  if public.get_learning_catalogue()#>>'{modules,0,completed}'<>'true' then raise exception 'FAIL module completion'; end if;
  s:=public.start_learning_session(pg_temp.start_request('listening'));
  if jsonb_array_length(s->'questions')<>1 or s#>>'{questions,0,exercise,type}'<>'listening_choice' then raise exception 'FAIL listening filter'; end if;
  s:=public.start_learning_session(pg_temp.start_request('words'));
  if jsonb_array_length(s->'questions')<>2 then raise exception 'FAIL words filter'; end if;
  s:=public.start_learning_session((pg_temp.start_request()-'moduleId')||'{"courseId":"21000000-0000-4000-8000-000000000001"}');
  if jsonb_array_length(s->'questions')<>4 then raise exception 'FAIL course start'; end if;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
  begin perform public.get_learning_session((s->>'id')::uuid); raise exception 'FAIL foreign resume'; exception when no_data_found then null; end;
  begin perform public.get_learning_session_asset((s->>'id')::uuid,gen_random_uuid()); raise exception 'FAIL foreign media'; exception when no_data_found then null; end;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
  begin perform public.start_learning_session(pg_temp.start_request()); raise exception 'FAIL teacher cannot start'; exception when insufficient_privilege then null; end;
  raise notice 'PASS delivery: four-type start/submit/rewards, private keys, ownership, retries, course selection, practice filtering';
end $$;
reset role;
-- New premium live revision: previous free pinned sessions must lose access too.
update public.quiz_revisions set status='archived' where id='41000000-0000-4000-8000-000000000001';
insert into public.quiz_revisions(id,quiz_id,revision,title,objective,access_tier) values('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001',2,'Premium','Test entitlement','premium');
insert into public.quiz_revision_items select '41000000-0000-4000-8000-000000000002',quiz_id,question_id,question_revision_id,position from public.quiz_revision_items where quiz_revision_id='41000000-0000-4000-8000-000000000001';
update public.quiz_revisions set status='published',published_at=now() where id='41000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare sid uuid; begin
  if public.get_learning_catalogue()#>>'{modules,0,locked}'<>'true' then raise exception 'FAIL locked metadata'; end if;
  begin perform public.start_learning_session(pg_temp.start_request()); raise exception 'FAIL premium start'; exception when insufficient_privilege then null; end;
  select id into sid from public.learning_sessions where user_id=auth.uid() limit 1;
  begin perform public.get_learning_session(sid); raise exception 'FAIL premium resume'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.profiles set has_subscription=true where id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin perform public.start_learning_session(pg_temp.start_request()); raise notice 'PASS premium entitlement'; end $$;
reset role;
update public.teacher_profiles set verification_status='rejected' where id='11000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ declare sid uuid; begin
  if public.get_learning_catalogue()->'modules'<>'[]'::jsonb then raise exception 'FAIL rejected teacher catalogue'; end if;
  begin perform public.start_learning_session(pg_temp.start_request()); raise exception 'FAIL rejected teacher start'; exception when no_data_found then null; end;
  select id into sid from public.learning_sessions where user_id=auth.uid() limit 1;
  begin perform public.get_learning_session(sid); raise exception 'FAIL rejected teacher resume'; exception when insufficient_privilege then null; end;
  raise notice 'PASS live withdrawal enforcement';
end $$;
reset role;
-- Whitelist discards unexpected authoring keys, including nested option fields.
do $$ declare value jsonb; begin
  value:=public.learning_public_presentation('{"assessment":{"secret":1},"feedback":{"secret":2},"prompt":{"en":"Hi","assessment":3},"instructions":{"en":"Choose"},"interaction":{"options":[{"id":"a","text":"A","correct":true,"assessment":4},{"id":"b","text":"B"}],"shuffleOptions":true,"assessment":5},"hints":[{"id":"h","text":{"en":"Hint","assessment":6}}],"media":[]}', 'multiple_choice');
  if value::text ~ 'assessment|feedback|correct' then raise exception 'FAIL nested whitelist'; end if;
  begin
    perform public.learning_public_presentation('{"prompt":{"en":{"assessment":"secret"}},"instructions":{"en":"Choose"},"interaction":{"options":[],"shuffleOptions":true},"hints":[],"media":[]}', 'multiple_choice');
    raise exception 'FAIL malformed nested scalar';
  exception when raise_exception then if sqlerrm <> 'INVALID_CONTENT' then raise; end if; end;
  raise notice 'PASS nested presentation whitelist and malformed scalar rejection';
end $$;
