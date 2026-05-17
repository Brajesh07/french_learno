-- ================================================================
-- Migration 003: notifications table
-- ================================================================

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),

  type        text        not null
                check (type in ('login', 'quiz_complete', 'course_complete', 'signup')),

  title       text        not null,
  message     text        not null,

  -- nullable: allows notifications that don't belong to a specific user
  user_id     uuid        references public.profiles(id) on delete set null,

  metadata    jsonb       not null default '{}',

  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Admins have full access; no direct student access (inserts done via service role)
create policy "Admins can manage notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

alter table public.notifications enable row level security;

create index notifications_is_read_idx   on public.notifications (is_read);
create index notifications_created_at_idx on public.notifications (created_at desc);
