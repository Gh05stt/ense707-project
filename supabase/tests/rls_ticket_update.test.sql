begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

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
  (910101, '10000000-0000-4000-8000-00000000000a', 'RLS-UPD A1', 'd', 'Other', 'low'),
  (910102, '10000000-0000-4000-8000-00000000000b', 'RLS-UPD B1', 'd', 'Other', 'low');

-- user A: every write is filtered to zero rows (UPDATE/DELETE under RLS do not raise errors)
select pg_temp.act_as('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

with changed as (update public.tickets set status = 'resolved' where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U1: user A cannot change the status of their own ticket') from changed;

with changed as (update public.tickets set priority = 'critical' where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U2: user A cannot change the priority of their own ticket') from changed;

with changed as (update public.tickets set status = 'in_progress' where ticket_id = 910102 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U3: user A cannot update user B''s ticket') from changed;

with removed as (delete from public.tickets where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U4: user A cannot delete their own ticket') from removed;

with removed as (delete from public.tickets where ticket_id = 910102 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U5: user A cannot delete user B''s ticket') from removed;

reset role;
select is(
  (select status || '/' || priority from public.tickets where ticket_id = 910101),
  'open/low',
  'TC-RLS-U6: user A''s ticket status and priority are unchanged'
);

-- staff and admin cannot delete (no DELETE policy)
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;
with removed as (delete from public.tickets where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U7: staff cannot delete tickets') from removed;

reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ad');
set local role authenticated;
with removed as (delete from public.tickets where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U8: admin cannot delete tickets') from removed;

-- anonymous
reset role;
select pg_temp.act_as(null);
set local role anon;
with changed as (update public.tickets set status = 'resolved' where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U9: anonymous requests cannot update tickets') from changed;

with removed as (delete from public.tickets where ticket_id = 910101 returning 1)
select is(count(*)::int, 0, 'TC-RLS-U10: anonymous requests cannot delete tickets') from removed;

reset role;
select is(
  (select count(*)::int from public.tickets where title like 'RLS-UPD%'),
  2,
  'TC-RLS-U11: both tickets still exist after the delete attempts'
);

-- staff and admin can update
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;
with changed as (update public.tickets set status = 'in_progress' where ticket_id = 910101 returning 1)
select is(count(*)::int, 1, 'TC-RLS-U12: staff can update ticket status') from changed;

with changed as (update public.tickets set priority = 'critical' where ticket_id = 910102 returning 1)
select is(count(*)::int, 1, 'TC-RLS-U13: staff can update ticket priority') from changed;

reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ad');
set local role authenticated;
with changed as (update public.tickets set priority = 'high' where ticket_id = 910101 returning 1)
select is(count(*)::int, 1, 'TC-RLS-U14: admin can update ticket priority') from changed;

reset role;
select is(
  (select status || '/' || priority from public.tickets where ticket_id = 910101),
  'in_progress/high',
  'TC-RLS-U15: staff and admin updates to ticket A1 are persisted'
);
select is(
  (select status || '/' || priority from public.tickets where ticket_id = 910102),
  'open/critical',
  'TC-RLS-U16: staff update to ticket B1 is persisted'
);

select * from finish();
rollback;
