delete from public.teacher_students where student_id in ('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002');
insert into auth.users(id,email) values('11000000-0000-4000-8000-000000000004','assignment-admin@example.test'),('11000000-0000-4000-8000-000000000005','assignment-other@example.test');
insert into public.profiles(id,email,username,name,role) values('11000000-0000-4000-8000-000000000004','assignment-admin@example.test','assignment_admin','Admin','admin'),('11000000-0000-4000-8000-000000000005','assignment-other@example.test','assignment_other','Other teacher','teacher');
insert into public.teacher_profiles(id,verification_status) values('11000000-0000-4000-8000-000000000005','pending');
create function pg_temp.assignment_test_request() returns jsonb language sql as $$ select jsonb_build_object('moduleId','31000000-0000-4000-8000-000000000001','mode','lesson','idempotencyKey',gen_random_uuid()); $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare c jsonb; begin
 c:=public.get_learning_catalogue();
 if c->'assignment'<>'null'::jsonb or c->'modules'<>'[]'::jsonb then raise exception 'FAIL unassigned catalogue'; end if;
 begin perform public.start_learning_session(pg_temp.assignment_test_request()); raise exception 'FAIL unassigned start'; exception when insufficient_privilege then null; end;
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL unassigned material'; exception when insufficient_privilege then null; end;
 begin perform public.assign_student_teacher(auth.uid(),'11000000-0000-4000-8000-000000000003',null); raise exception 'FAIL student self assignment'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.courses where id='21000000-0000-4000-8000-000000000001') then raise exception 'FAIL legacy course access'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000004',true);
do $$ declare first jsonb; again jsonb; begin
 begin perform public.assign_student_teacher('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000005',null); raise exception 'FAIL pending teacher assignment'; exception when invalid_parameter_value then null; end;
 first:=public.assign_student_teacher('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000003',null);
 again:=public.assign_student_teacher('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000003',null);
 if first->'assignment'<>again->'assignment' then raise exception 'FAIL assignment retry'; end if;
 begin perform public.assign_student_teacher('11000000-0000-4000-8000-000000000001',null,null); raise exception 'FAIL stale admin write'; exception when serialization_failure then null; end;
 begin insert into public.teacher_students(teacher_id,student_id) values('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000002'); raise exception 'FAIL direct browser mutation'; exception when insufficient_privilege then null; end;
 if (select count(*) from public.quiz_question_keys where question_revision_id in (select id from public.quiz_question_revisions where quiz_id='31000000-0000-4000-8000-000000000001'))<>4 then raise exception 'FAIL admin moderation RLS'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
do $$ declare roster jsonb; begin
 roster:=public.list_assigned_students();
 if jsonb_array_length(roster)<>1 or roster#>>'{0,id}'<>'11000000-0000-4000-8000-000000000001' then raise exception 'FAIL own roster'; end if;
 begin perform public.assign_student_teacher('11000000-0000-4000-8000-000000000002',auth.uid(),null); raise exception 'FAIL teacher assignment mutation'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare s jsonb; c jsonb; q jsonb; begin
 c:=public.get_learning_catalogue();
 if jsonb_array_length(c->'modules')<>1 or c#>>'{assignment,teacherId}'<>'11000000-0000-4000-8000-000000000003' then raise exception 'FAIL assigned catalogue: %',c; end if;
 perform public.get_learning_material('31000000-0000-4000-8000-000000000001');
 s:=public.start_learning_session(pg_temp.assignment_test_request());q:=s#>'{questions,0}';
 perform public.submit_learning_answer((s->>'id')::uuid,jsonb_build_object('schemaVersion',1,'sessionId',s->>'id','sessionQuestionId',q->>'id','idempotencyKey',gen_random_uuid(),'type',q#>>'{exercise,type}','response','{"optionId":"a"}'::jsonb,'assistance','{"hintIds":[],"transcriptShown":false}'::jsonb));
 if not exists(select 1 from public.courses where id='21000000-0000-4000-8000-000000000001') then raise exception 'FAIL assigned free course'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000004',true);
do $$ declare link uuid; begin
 select id into link from public.teacher_students where student_id='11000000-0000-4000-8000-000000000001' and ended_at is null;
 perform public.assign_student_teacher('11000000-0000-4000-8000-000000000001',null,link);
 if not exists(select 1 from public.teacher_students where id=link and ended_at is not null) then raise exception 'FAIL lost history'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare sid uuid; qid uuid; c jsonb; begin
 c:=public.get_learning_catalogue();
 if c->'modules'<>'[]'::jsonb or c->'activeSessions'<>'[]'::jsonb then raise exception 'FAIL revoked catalogue'; end if;
 select id into sid from public.learning_sessions where user_id=auth.uid() limit 1;
 select id into qid from public.learning_session_questions where session_id=sid and position=2;
 begin perform public.get_learning_session(sid); raise exception 'FAIL revoked resume'; exception when insufficient_privilege then null; end;
 begin perform public.submit_learning_answer(sid,jsonb_build_object('schemaVersion',1,'sessionId',sid,'sessionQuestionId',qid,'idempotencyKey',gen_random_uuid(),'type','typed_recall','response','{"text":"café"}'::jsonb,'assistance','{"hintIds":[],"transcriptShown":false}'::jsonb)); raise exception 'FAIL revoked submit'; exception when insufficient_privilege then null; end;
 begin perform public.submit_learning_answer_v1(sid,'{}'); raise exception 'FAIL bypass wrapper'; exception when insufficient_privilege then null; end;
 if not exists(select 1 from public.learning_responses where user_id=auth.uid()) then raise exception 'FAIL lost progress'; end if;
 raise notice 'PASS assignment lifecycle, role gates, catalogue, start, read, grading, revocation, history and admin moderation';
end $$;
reset role;

update public.teacher_profiles set verification_status='approved' where id='11000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000004',true);
select public.assign_student_teacher('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000005',null)->'assignment' is not null;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare c jsonb; begin
 c:=public.get_learning_catalogue();
 if c#>>'{assignment,teacherId}'<>'11000000-0000-4000-8000-000000000005' or c->'modules'<>'[]'::jsonb then raise exception 'FAIL other teacher content'; end if;
 begin perform public.start_learning_session(pg_temp.assignment_test_request()); raise exception 'FAIL other teacher direct start'; exception when insufficient_privilege then null; end;
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL other teacher direct material'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
do $$ begin if public.list_assigned_students()<>'[]'::jsonb then raise exception 'FAIL old teacher roster'; end if; end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000005',true);
do $$ begin if jsonb_array_length(public.list_assigned_students())<>1 then raise exception 'FAIL new teacher roster'; end if; end $$;
reset role;
update public.profiles set is_active=false where id='11000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ begin
 if public.get_learning_catalogue()->'assignment'<>'null'::jsonb then raise exception 'FAIL inactive assigned teacher'; end if;
 raise notice 'PASS reassignment isolation and teacher deactivation';
end $$;
reset role;
