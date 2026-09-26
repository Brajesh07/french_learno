-- Executed after 011 in the SAME uncommitted transaction; runner rolls back.
insert into auth.users(id,email) values
('11000000-0000-4000-8000-000000000001','submit-a@example.test'),
('11000000-0000-4000-8000-000000000002','submit-b@example.test'),
('11000000-0000-4000-8000-000000000003','submit-teacher@example.test');
insert into public.profiles(id,email,username,name,role) values
('11000000-0000-4000-8000-000000000001','submit-a@example.test','submit_test_a','Test A','student'),
('11000000-0000-4000-8000-000000000002','submit-b@example.test','submit_test_b','Test B','student'),
('11000000-0000-4000-8000-000000000003','submit-teacher@example.test','submit_test_teacher','Teacher','teacher');
insert into public.teacher_profiles(id,verification_status) values('11000000-0000-4000-8000-000000000003','approved');
-- After the assignment rollout, these grading fixtures are assigned explicitly.
do $$ begin
 if to_regprocedure('public.assigned_teacher_id()') is not null then
  insert into public.teacher_students(teacher_id,student_id) values
  ('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001'),
  ('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000002');
 end if;
end $$;
insert into public.courses(id,title,level,created_by,is_published) values
('21000000-0000-4000-8000-000000000001','Fixture','A1','11000000-0000-4000-8000-000000000003',true);
insert into public.quizzes(id,course_id,title,created_by,is_published) values
('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','Fixture','11000000-0000-4000-8000-000000000003',true);
insert into public.quiz_revisions(id,quiz_id,revision,title,objective) values
('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001',1,'Fixture','Test all graders');
do $$ declare i integer; t text; presentation jsonb; assessment jsonb; qid uuid; rid uuid; begin
  for i in 1..4 loop
    t := (array['multiple_choice','typed_recall','sentence_builder','listening_choice'])[i];
    qid:=('51000000-0000-4000-8000-00000000000'||i)::uuid;
    rid:=('61000000-0000-4000-8000-00000000000'||i)::uuid;
    presentation:='{"prompt":{"en":"Test"},"instructions":{"en":"Answer"},"hints":[{"id":"h1","text":{"en":"Hint"}}],"media":[]}'::jsonb;
    if i in (1,4) then
      presentation:=presentation||'{"interaction":{"options":[{"id":"a","text":"Bonjour"},{"id":"b","text":"Merci"}],"shuffleOptions":true}}';
      assessment:='{"gradingStrategy":"single_option","correctOptionId":"a","gradingVersion":1,"maxScore":1}';
    elsif i=2 then
      presentation:=presentation||'{"interaction":{"maxLength":80,"inputLanguage":"fr-FR","characterPalette":[]}}';
      assessment:='{"gradingStrategy":"accepted_text","acceptedAnswers":["café"],"normalizationPolicy":"fr-basic-v1","gradingVersion":1,"maxScore":1}';
    else
      presentation:=presentation||'{"interaction":{"tokens":[{"id":"x","text":"Bonjour"},{"id":"y","text":"merci"}],"shuffleTokens":true,"allowTokenReturn":true}}';
      assessment:='{"gradingStrategy":"ordered_tokens","acceptedSequences":[["x","y"]],"gradingVersion":1,"maxScore":1}';
    end if;
    if i=4 then presentation:=jsonb_set(presentation,'{media}','[{"kind":"audio","source":"tts","text":"Bonjour","locale":"fr-FR","rate":0.78,"transcript":{"text":"Bonjour","reveal":"on_request"}}]'); end if;
    insert into public.quiz_questions(id,quiz_id,question) values(qid,'31000000-0000-4000-8000-000000000001','Test');
    insert into public.quiz_question_revisions(id,question_id,quiz_id,content_revision,type,presentation)
      values(rid,qid,'31000000-0000-4000-8000-000000000001',1,t,presentation);
    insert into public.quiz_question_keys values(rid,t,assessment,'{"correctAnswerDisplay":"Test","explanation":{"en":"Fixture explanation"}}');
    insert into public.quiz_revision_items values('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001',qid,rid,i);
  end loop;
end $$;
update public.quiz_revisions set status='published',published_at=now() where id='41000000-0000-4000-8000-000000000001';
insert into public.learning_sessions(id,user_id,quiz_revision_id,mode,question_count,activity_date,time_zone) values
('71000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','lesson',4,current_date,'UTC'),
('71000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000001','lesson',4,current_date,'UTC'),
('71000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001',null,'review',1,current_date,'UTC'),
('71000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000001',null,'daily',1,current_date,'UTC');
insert into public.learning_session_questions(id,session_id,question_revision_id,type,position)
select ('81000000-0000-4000-8000-00000000000'||i.position)::uuid,'71000000-0000-4000-8000-000000000001',i.question_revision_id,q.type,i.position
from public.quiz_revision_items i join public.quiz_question_revisions q on q.id=i.question_revision_id where i.quiz_revision_id='41000000-0000-4000-8000-000000000001';
insert into public.learning_session_questions(id,session_id,question_revision_id,type,position)
select ('82000000-0000-4000-8000-00000000000'||i.position)::uuid,'71000000-0000-4000-8000-000000000002',i.question_revision_id,q.type,i.position
from public.quiz_revision_items i join public.quiz_question_revisions q on q.id=i.question_revision_id where i.quiz_revision_id='41000000-0000-4000-8000-000000000001';
insert into public.learning_session_questions(id,session_id,question_revision_id,type,position,review_eligible) values
('83000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000002','typed_recall',1,true),
('84000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000004','61000000-0000-4000-8000-000000000001','multiple_choice',1,false);
create function pg_temp.payload(s uuid,q uuid,t text,r jsonb,k uuid default gen_random_uuid()) returns jsonb language sql as $$
select jsonb_build_object('schemaVersion',1,'sessionId',s,'sessionQuestionId',q,'idempotencyKey',k,'type',t,'response',r,'assistance','{"hintIds":[],"transcriptShown":false}'::jsonb);
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare s uuid:='71000000-0000-4000-8000-000000000001'; p jsonb; r jsonb; again jsonb; begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL ownership';
  exception when no_data_found then null; end;
  begin
    perform public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}')||'{"xp":999}');
    raise exception 'FAIL forged reward';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000002','typed_recall','{"text":"café"}'));
    raise exception 'FAIL sequence';
  exception when sqlstate 'P0003' then if sqlerrm <> 'OUT_OF_ORDER' then raise; end if; end;
  begin
    perform public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"foreign-option"}'));
    raise exception 'FAIL foreign option';
  exception when invalid_parameter_value then null; end;
  p:=pg_temp.payload(s,'81000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}');
  r:=public.submit_learning_answer(s,p); again:=public.submit_learning_answer(s,p);
  if r<>again or r#>>'{reward,xp}' <> '10' or r#>>'{totals,hearts}'<>'5' then raise exception 'FAIL MCQ or retry'; end if;
  begin
    perform public.submit_learning_answer(s,jsonb_set(p,'{response}','{"optionId":"b"}'));
    raise exception 'FAIL altered retry';
  exception when sqlstate 'P0003' then if sqlerrm<>'IDEMPOTENCY_CONFLICT' then raise;end if; end;
  begin
    perform public.submit_learning_answer(s,jsonb_set(p,'{idempotencyKey}',to_jsonb(gen_random_uuid())));
    raise exception 'FAIL duplicate first answer';
  exception when sqlstate 'P0003' then if sqlerrm<>'ALREADY_ANSWERED' then raise;end if; end;
  r:=public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000002','typed_recall','{"text":"cafe"}'));
  if r->>'isCorrect'<>'false' or r#>>'{reward,heartsDelta}'<>'-1' or r#>>'{totals,hearts}'<>'4' then raise exception 'FAIL accents/hearts';end if;
  begin
    perform public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000003','sentence_builder','{"tokenIds":["x","x"]}'));
    raise exception 'FAIL duplicate token';
  exception when invalid_parameter_value then null;end;
  r:=public.submit_learning_answer(s,pg_temp.payload(s,'81000000-0000-4000-8000-000000000003','sentence_builder','{"tokenIds":["x","y"]}'));
  if r#>>'{reward,xp}'<>'20' then raise exception 'FAIL builder';end if;
  p:=pg_temp.payload(s,'81000000-0000-4000-8000-000000000004','listening_choice','{"optionId":"a"}');
  r:=public.submit_learning_answer(s,p);
  if r#>>'{session,completed}'<>'true' or r#>>'{session,passed}'<>'true' or r#>>'{totals,xp}'<>'40' or r#>>'{totals,coins}'<>'10' then raise exception 'FAIL final rewards: %',r;end if;
  if public.submit_learning_answer(s,p)<>r then raise exception 'FAIL completed retry';end if;
  r:=public.submit_learning_answer('71000000-0000-4000-8000-000000000003',pg_temp.payload('71000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001','typed_recall',jsonb_build_object('text',U&' CAFE\0301! ')));
  if r->>'isCorrect'<>'true' or r#>>'{reward,heartsDelta}'<>'1' or r#>>'{totals,hearts}'<>'5' then raise exception 'FAIL normalized review';end if;
  if (select stage from public.learning_review_state where question_id='51000000-0000-4000-8000-000000000002')<>1 then raise exception 'FAIL review schedule';end if;
  r:=public.submit_learning_answer('71000000-0000-4000-8000-000000000004',pg_temp.payload('71000000-0000-4000-8000-000000000004','84000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
  if r#>>'{rewardBreakdown,answerXp}'<>'0' or r#>>'{totals,xp}'<>'100' or r#>>'{totals,coins}'<>'20' then raise exception 'FAIL daily/repeat cap: %',r;end if;
end $$;
reset role;
-- Force a failure after response insertion; all response/totals/reward writes
-- must disappear together. This trigger exists only in the rollback transaction.
create function pg_temp.fail_reward() returns trigger language plpgsql as $$ begin raise exception 'INJECTED_WRITE_FAILURE'; end $$;
create trigger test_reward_failure before insert on public.learning_reward_events
for each row when(new.user_id='11000000-0000-4000-8000-000000000002'::uuid) execute function pg_temp.fail_reward();
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL injection did not run';
  exception when raise_exception then if sqlerrm<>'INJECTED_WRITE_FAILURE' then raise;end if;end;
  if exists(select 1 from public.learning_responses) or exists(select 1 from public.learning_totals) then raise exception 'FAIL transaction rollback';end if;
  if exists(select 1 from public.quiz_question_keys) then raise exception 'FAIL private key visibility';end if;
end $$;
reset role;
drop trigger test_reward_failure on public.learning_reward_events;
-- Invalid private key is a server error; the student's answer is not consumed.
update public.quiz_question_keys set assessment=jsonb_set(assessment,'{correctOptionId}','"missing"') where question_revision_id='61000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL bad key accepted';
  exception when raise_exception then if sqlerrm<>'INVALID_CONTENT' then raise;end if;end;
  if exists(select 1 from public.learning_responses) then raise exception 'FAIL malformed content persisted';end if;
end $$;
reset role;
update public.quiz_question_keys set assessment=jsonb_set(assessment,'{correctOptionId}','"a"') where question_revision_id='61000000-0000-4000-8000-000000000001';
-- Withdrawing the parent quiz and teacher approval both block existing sessions.
update public.quizzes set is_published=false where id='31000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL unpublished accepted';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.quizzes set is_published=true where id='31000000-0000-4000-8000-000000000001';
update public.teacher_profiles set verification_status='rejected' where id='11000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL rejected teacher';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.teacher_profiles set verification_status='approved' where id='11000000-0000-4000-8000-000000000003';
-- A new premium live revision must gate an older pinned free revision too.
insert into public.quiz_revisions(id,quiz_id,revision,title,objective,access_tier) values
('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001',2,'Premium','Fixture','premium');
insert into public.quiz_revision_items select '41000000-0000-4000-8000-000000000002'::uuid,quiz_id,question_id,question_revision_id,position from public.quiz_revision_items where quiz_revision_id='41000000-0000-4000-8000-000000000001';
update public.quiz_revisions set status='archived' where id='41000000-0000-4000-8000-000000000001';
update public.quiz_revisions set status='published',published_at=now() where id='41000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
  begin
    perform public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
    raise exception 'FAIL premium accepted';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.profiles set has_subscription=true where id='11000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ declare r jsonb;begin
  r:=public.submit_learning_answer('71000000-0000-4000-8000-000000000002',pg_temp.payload('71000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','multiple_choice','{"optionId":"a"}'));
  if r->>'isCorrect'<>'true' then raise exception 'FAIL entitled archived revision';end if;
end $$;
reset role;
select 'PASS: four graders, ownership, exact retries, reward caps, coins, hearts, review, atomic rollback, private keys, publication, approval and premium access' as result;
