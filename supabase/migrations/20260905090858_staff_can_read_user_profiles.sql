-- S-10: allow staff/admin to read user profiles so requester and note author
-- names resolve in embedded selects. A policy on public.users cannot query
-- public.users directly without infinite recursion, so the role check runs in
-- a SECURITY DEFINER function that bypasses RLS for that lookup only.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where user_id = (select auth.uid())
      and role in ('staff', 'admin')
  );
$$;

-- Default privileges in this schema grant EXECUTE on new functions to anon and
-- service_role, so those must be revoked explicitly in addition to public.
revoke all on function public.is_staff() from public, anon, service_role;
grant execute on function public.is_staff() to authenticated;

create policy "Staff can view all user profiles"
  on public.users
  for select
  to authenticated
  using ((select public.is_staff()));
