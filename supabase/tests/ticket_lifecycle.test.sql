begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
end;
$$;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'sectest-user-a@example.test'),
  ('10000000-0000-4000-8000-0000000000c5', 'sectest-staff@example.test');
insert into public.users (user_id, name, email, role) values
  ('10000000-0000-4000-8000-00000000000a', 'SecTest User A', 'sectest-user-a@example.test', 'user'),
  ('10000000-0000-4000-8000-0000000000c5', 'SecTest Staff', 'sectest-staff@example.test', 'staff')
on conflict (user_id) do update set role = excluded.role;

insert into public.tickets (ticket_id, user_id, title, description, category, priority)
overriding system value values
  (910301, '10000000-0000-4000-8000-00000000000a', 'LIFE open', 'd', 'Other', 'low'),
  (910302, '10000000-0000-4000-8000-00000000000a', 'LIFE in progress', 'd', 'Other', 'low'),
  (910303, '10000000-0000-4000-8000-00000000000a', 'LIFE resolve then close', 'd', 'Other', 'low'),
  (910304, '10000000-0000-4000-8000-00000000000a', 'LIFE tamper', 'd', 'Other', 'low');
update public.tickets set status = 'in_progress' where ticket_id = 910302;

-- all lifecycle changes are made as staff, the only role allowed to update tickets
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;

select throws_ok(
  $$ update public.tickets set status = 'closed' where ticket_id = 910301 $$,
  '23514', null,
  'TC-LIFE-1: an Open ticket cannot be closed directly'
);
select throws_ok(
  $$ update public.tickets set status = 'closed' where ticket_id = 910302 $$,
  '23514', null,
  'TC-LIFE-2: an In Progress ticket cannot be closed directly'
);
select ok(
  (select status = 'open' and closed_at is null from public.tickets where ticket_id = 910301),
  'TC-LIFE-3: the Open ticket is unchanged after the rejected close'
);
select ok(
  (select status = 'in_progress' and closed_at is null from public.tickets where ticket_id = 910302),
  'TC-LIFE-4: the In Progress ticket is unchanged after the rejected close'
);

select lives_ok(
  $$ update public.tickets set status = 'resolved' where ticket_id = 910303 $$,
  'TC-LIFE-5: staff can resolve a ticket'
);
select ok(
  (select resolved_at = now() and closed_at is null from public.tickets where ticket_id = 910303),
  'TC-LIFE-6: resolving sets resolved_at to the database time and leaves closed_at empty'
);
select lives_ok(
  $$ update public.tickets set status = 'closed' where ticket_id = 910303 $$,
  'TC-LIFE-7: a Resolved ticket can be closed'
);
select ok(
  (select status = 'closed' and closed_at = now() and resolved_at is not null
   from public.tickets where ticket_id = 910303),
  'TC-LIFE-8: closing sets closed_at and keeps resolved_at'
);

update public.tickets
  set status = 'resolved', resolved_at = '2000-01-01', closed_at = '2000-01-02'
  where ticket_id = 910304;
select ok(
  (select resolved_at = now() and closed_at is null from public.tickets where ticket_id = 910304),
  'TC-LIFE-9: client-supplied resolved_at and closed_at are overridden when resolving'
);

update public.tickets
  set priority = 'high', resolved_at = '2000-01-01', closed_at = '2000-01-01'
  where ticket_id = 910301;
select ok(
  (select resolved_at is null and closed_at is null from public.tickets where ticket_id = 910301),
  'TC-LIFE-10: lifecycle timestamps cannot be set without a status change'
);

update public.tickets set status = 'in_progress' where ticket_id = 910304;
select ok(
  (select resolved_at is null and closed_at is null from public.tickets where ticket_id = 910304),
  'TC-LIFE-11: moving a Resolved ticket back to In Progress clears resolved_at'
);

update public.tickets set updated_at = '2000-01-01' where ticket_id = 910301;
select is(
  (select updated_at from public.tickets where ticket_id = 910301),
  now(),
  'TC-LIFE-12: updated_at cannot be backdated by the client'
);

update public.tickets set created_at = '2000-01-01' where ticket_id = 910301;
select is(
  (select created_at from public.tickets where ticket_id = 910301),
  now(),
  'TC-LIFE-13: created_at cannot be changed after creation'
);

select * from finish();
rollback;
