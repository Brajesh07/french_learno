-- Fix infinite recursion: profiles policies must not subquery profiles directly.
-- Use the security-definer is_admin() helper instead.

drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Admins can read all profiles"
  on public.profiles
  for select
  using (public.is_admin());
