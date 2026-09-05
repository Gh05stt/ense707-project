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

revoke all on function public.is_staff() from public, anon, service_role;
grant execute on function public.is_staff() to authenticated;

create policy "Staff can view all user profiles"
  on public.users
  for select
  to authenticated
  using ((select public.is_staff()));
