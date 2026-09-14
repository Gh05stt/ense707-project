begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
end;
$$;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'sectest-user-a@example.test'),
  ('10000000-0000-4000-8000-0000000000c5', 'sectest-staff@example.test'),
  ('10000000-0000-4000-8000-00000000000e', 'sectest-no-profile@example.test');
insert into public.users (user_id, name, email, role) values
  ('10000000-0000-4000-8000-00000000000a', 'SecTest User A', 'sectest-user-a@example.test', 'user'),
  ('10000000-0000-4000-8000-0000000000c5', 'SecTest Staff', 'sectest-staff@example.test', 'staff')
on conflict (user_id) do update set role = excluded.role;

-- user A
select pg_temp.act_as('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

with changed as (
  update public.users set role = 'staff' where user_id = '10000000-0000-4000-8000-00000000000a' returning 1
)
select is(count(*)::int, 0, 'TC-RLS-P1: a user cannot promote themselves to staff') from changed;

with changed as (
  update public.users set role = 'admin' where user_id = '10000000-0000-4000-8000-00000000000a' returning 1
)
select is(count(*)::int, 0, 'TC-RLS-P2: a user cannot promote themselves to admin') from changed;

select is(public.is_staff(), false, 'TC-RLS-P3: is_staff() is false for a normal user');

select throws_ok(
  $$ insert into public.users (user_id, name, email, role)
     values ('10000000-0000-4000-8000-00000000000e', 'Eve', 'sectest-no-profile@example.test', 'staff') $$,
  '42501', null,
  'TC-RLS-P4: a user cannot insert a privileged profile'
);

with removed as (
  delete from public.users where user_id = '10000000-0000-4000-8000-00000000000a' returning 1
)
select is(count(*)::int, 0, 'TC-RLS-P5: a user cannot delete their own profile') from removed;

-- staff cannot change roles through the API either
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;

with changed as (
  update public.users set role = 'staff' where user_id = '10000000-0000-4000-8000-00000000000a' returning 1
)
select is(count(*)::int, 0, 'TC-RLS-P6: staff cannot change another user''s role') from changed;

with changed as (
  update public.users set role = 'admin' where user_id = '10000000-0000-4000-8000-0000000000c5' returning 1
)
select is(count(*)::int, 0, 'TC-RLS-P7: staff cannot promote themselves to admin') from changed;

reset role;
select is(
  (select role from public.users where user_id = '10000000-0000-4000-8000-00000000000a'),
  'user',
  'TC-RLS-P8: user A is still a normal user'
);
select is(
  (select role from public.users where user_id = '10000000-0000-4000-8000-0000000000c5'),
  'staff',
  'TC-RLS-P9: the staff account is still staff'
);
select is_empty(
  $$ select 1 from public.users where user_id = '10000000-0000-4000-8000-00000000000e' $$,
  'TC-RLS-P10: no profile was created by the rejected insert'
);

-- The live auth.users trigger is not in the repository snapshot, so it is attached here for this transaction only.
create trigger sectest_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-0000000000e1', 'sectest-signup@example.test', '{"name": "Mallory", "role": "admin"}');

select is(
  (select role from public.users where user_id = '10000000-0000-4000-8000-0000000000e1'),
  'user',
  'TC-RLS-P11: handle_new_user ignores a role supplied in signup metadata'
);

select * from finish();
rollback;
