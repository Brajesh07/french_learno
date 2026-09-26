update public.courses set content_text='**Bonjour** means hello.',
 content_audio_url='https://example.test/audio.mp3',content_image_url='https://example.test/image.png',
 content_video_url='https://example.test/video.mp4'
 where id='21000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ declare material jsonb; begin
 material:=public.get_learning_material('31000000-0000-4000-8000-000000000001');
 if material->>'text'<>'**Bonjour** means hello.' or material->>'audioUrl'<>'https://example.test/audio.mp3' then raise exception 'FAIL material delivery'; end if;
 if material::text ~ 'assessment|correctOptionId|acceptedAnswers|acceptedSequences|correctAnswerDisplay' then raise exception 'FAIL grading key leak'; end if;
 if (select count(*) from jsonb_object_keys(material))<>12 then raise exception 'FAIL explicit material contract'; end if;
 if exists(select 1 from public.learning_sessions where user_id=auth.uid()) then raise exception 'FAIL reading created a session'; end if;
 begin perform public.get_learning_material(gen_random_uuid()); raise exception 'FAIL missing module'; exception when no_data_found then null; end;
end $$;
reset role;
-- The current published entitlement, not a client-provided plan, controls reads.
update public.quiz_revisions set status='archived' where id='41000000-0000-4000-8000-000000000001';
insert into public.quiz_revisions(id,quiz_id,revision,title,objective,access_tier)
 values('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001',2,'Premium','Read first','premium');
insert into public.quiz_revision_items select '41000000-0000-4000-8000-000000000002',quiz_id,question_id,question_revision_id,position from public.quiz_revision_items where quiz_revision_id='41000000-0000-4000-8000-000000000001';
update public.quiz_revisions set status='published',published_at=now() where id='41000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL premium read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.profiles set has_subscription=true where id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); end $$;
reset role;
update public.courses set is_published=false where id='21000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL unpublished course'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.courses set is_published=true where id='21000000-0000-4000-8000-000000000001';
update public.teacher_profiles set verification_status='rejected' where id='11000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL rejected teacher'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.teacher_profiles set verification_status='approved' where id='11000000-0000-4000-8000-000000000003';
update public.profiles set is_active=false where id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL inactive account'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.profiles set is_active=true,must_change_password=true where id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL password reset gate'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL staff account'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.get_learning_material('31000000-0000-4000-8000-000000000001'); raise exception 'FAIL anonymous read'; exception when insufficient_privilege then null; end;
 raise notice 'PASS material: free/premium access, publication, teacher approval, account gates, no sessions or grading keys';
end $$;
reset role;
