begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
end;
$$;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'sectest-user-a@example.test'),
  ('10000000-0000-4000-8000-00000000000b', 'sectest-user-b@example.test'),
  ('10000000-0000-4000-8000-0000000000c5', 'sectest-staff@example.test'),
  ('10000000-0000-4000-8000-0000000000ad', 'sectest-admin@example.test');
insert into public.users (user_id, name, email, role) values
  ('10000000-0000-4000-8000-00000000000a', 'SecTest User A', 'sectest-user-a@example.test', 'user'),
  ('10000000-0000-4000-8000-00000000000b', 'SecTest User B', 'sectest-user-b@example.test', 'user'),
  ('10000000-0000-4000-8000-0000000000c5', 'SecTest Staff', 'sectest-staff@example.test', 'staff'),
  ('10000000-0000-4000-8000-0000000000ad', 'SecTest Admin', 'sectest-admin@example.test', 'admin')
on conflict (user_id) do update set role = excluded.role;

insert into public.tickets (ticket_id, user_id, title, description, category, priority)
overriding system value values
  (910001, '10000000-0000-4000-8000-00000000000a', 'RLS-READ A1', 'd', 'Other', 'low'),
  (910002, '10000000-0000-4000-8000-00000000000a', 'RLS-READ A2', 'd', 'Other', 'low'),
  (910003, '10000000-0000-4000-8000-00000000000b', 'RLS-READ B1', 'd', 'Other', 'low');
insert into public.resolution_notes (note_id, ticket_id, staff_user_id, note_text)
overriding system value values
  (920001, 910001, '10000000-0000-4000-8000-0000000000c5', 'note on A1'),
  (920002, 910003, '10000000-0000-4000-8000-0000000000c5', 'note on B1');

-- user A
select pg_temp.act_as('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select set_eq(
  $$ select ticket_id from public.tickets where title like 'RLS-READ%' $$,
  array[910001, 910002]::bigint[],
  'TC-RLS-R1: user A reads only their own tickets'
);
select is_empty(
  $$ select 1 from public.tickets where ticket_id = 910003 $$,
  'TC-RLS-R2: user A cannot read user B''s ticket by ID'
);
select set_eq(
  $$ select note_id from public.resolution_notes where note_id in (920001, 920002) $$,
  array[920001]::bigint[],
  'TC-RLS-R3: user A reads notes only on their own tickets'
);
select set_eq(
  $$ select user_id from public.users where email like 'sectest-%' $$,
  array['10000000-0000-4000-8000-00000000000a']::uuid[],
  'TC-RLS-R4: user A reads only their own profile'
);

-- user B
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-00000000000b');
set local role authenticated;

select set_eq(
  $$ select ticket_id from public.tickets where title like 'RLS-READ%' $$,
  array[910003]::bigint[],
  'TC-RLS-R5: user B reads only their own ticket'
);

-- staff
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;

select set_eq(
  $$ select ticket_id from public.tickets where title like 'RLS-READ%' $$,
  array[910001, 910002, 910003]::bigint[],
  'TC-RLS-R6: staff read all tickets'
);
select set_eq(
  $$ select note_id from public.resolution_notes where note_id in (920001, 920002) $$,
  array[920001, 920002]::bigint[],
  'TC-RLS-R7: staff read all resolution notes'
);
select is(
  (select count(*)::int from public.users where email like 'sectest-%'),
  4,
  'TC-RLS-R8: staff read all user profiles (requester names)'
);

-- admin
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ad');
set local role authenticated;

select set_eq(
  $$ select ticket_id from public.tickets where title like 'RLS-READ%' $$,
  array[910001, 910002, 910003]::bigint[],
  'TC-RLS-R9: admin reads all tickets'
);
select set_eq(
  $$ select note_id from public.resolution_notes where note_id in (920001, 920002) $$,
  array[920001, 920002]::bigint[],
  'TC-RLS-R10: admin reads all resolution notes'
);

-- anonymous (anon has table GRANTs but no policies)
reset role;
select pg_temp.act_as(null);
set local role anon;

select is_empty($$ select 1 from public.tickets where title like 'RLS-READ%' $$,
  'TC-RLS-R11: anonymous requests read no tickets');
select is_empty($$ select 1 from public.resolution_notes where note_id in (920001, 920002) $$,
  'TC-RLS-R12: anonymous requests read no notes');
select is_empty($$ select 1 from public.users where email like 'sectest-%' $$,
  'TC-RLS-R13: anonymous requests read no profiles');

-- authenticated user with no profile row
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ff');
set local role authenticated;

select is_empty($$ select 1 from public.tickets where title like 'RLS-READ%' $$,
  'TC-RLS-R14: an authenticated account without a profile reads no other users'' tickets');

select * from finish();
rollback;
