begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

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
  (910201, '10000000-0000-4000-8000-00000000000a', 'RLS-NOTE A1', 'd', 'Other', 'low'),
  (910202, '10000000-0000-4000-8000-00000000000b', 'RLS-NOTE B1', 'd', 'Other', 'low');
insert into public.resolution_notes (note_id, ticket_id, staff_user_id, note_text)
overriding system value values
  (920201, 910201, '10000000-0000-4000-8000-0000000000c5', 'original');

-- user A
select pg_temp.act_as('10000000-0000-4000-8000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-00000000000a', 'user note') $$,
  '42501', null,
  'TC-RLS-N1: a user cannot add a note to their own ticket'
);
select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-0000000000c5', 'spoofed staff note') $$,
  '42501', null,
  'TC-RLS-N2: a user cannot add a note by spoofing a staff member''s ID'
);
select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910202, '10000000-0000-4000-8000-00000000000a', 'note on other ticket') $$,
  '42501', null,
  'TC-RLS-N3: a user cannot add a note to another user''s ticket'
);

with changed as (update public.resolution_notes set note_text = 'tampered' where note_id = 920201 returning 1)
select is(count(*)::int, 0, 'TC-RLS-N4: a user cannot edit a staff note on their ticket') from changed;

with removed as (delete from public.resolution_notes where note_id = 920201 returning 1)
select is(count(*)::int, 0, 'TC-RLS-N5: a user cannot delete a staff note on their ticket') from removed;

-- staff
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000c5');
set local role authenticated;

select lives_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910202, '10000000-0000-4000-8000-0000000000c5', 'staff note') $$,
  'TC-RLS-N6: staff can add a note in their own name'
);
select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-0000000000ad', 'impersonated admin note') $$,
  '42501', null,
  'TC-RLS-N7: staff cannot add a note in another staff member''s name'
);

with changed as (update public.resolution_notes set note_text = 'edited' where note_id = 920201 returning 1)
select is(count(*)::int, 0, 'TC-RLS-N8: staff cannot edit existing notes (no UPDATE policy)') from changed;

-- admin
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ad');
set local role authenticated;

select lives_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-0000000000ad', 'admin note') $$,
  'TC-RLS-N9: admin can add a note in their own name'
);

-- anonymous
reset role;
select pg_temp.act_as(null);
set local role anon;

select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-0000000000c5', 'anon note') $$,
  '42501', null,
  'TC-RLS-N10: anonymous requests cannot add notes'
);

-- authenticated account without a profile
reset role;
select pg_temp.act_as('10000000-0000-4000-8000-0000000000ff');
set local role authenticated;

select throws_ok(
  $$ insert into public.resolution_notes (ticket_id, staff_user_id, note_text)
     values (910201, '10000000-0000-4000-8000-0000000000ff', 'no profile note') $$,
  '42501', null,
  'TC-RLS-N11: an authenticated account without a staff profile cannot add notes'
);

reset role;
select set_eq(
  $$ select note_text from public.resolution_notes where ticket_id in (910201, 910202) $$,
  array['original', 'staff note', 'admin note'],
  'TC-RLS-N12: only the authorised staff and admin notes were stored, and the original is unchanged'
);

select * from finish();
rollback;
