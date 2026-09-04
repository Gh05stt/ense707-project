-- S-03 regression tests: run with `supabase test db` (pgTAP).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 's03-user-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 's03-user-b@test.local');
insert into public.users (user_id, name, email, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'S03 User A', 's03-user-a@test.local', 'user'),
  ('00000000-0000-0000-0000-0000000000b2', 'S03 User B', 's03-user-b@test.local', 'user')
on conflict (user_id) do nothing;

set local role authenticated;
-- Older auth.uid() builds read request.jwt.claim.sub; current ones read request.jwt.claims.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

select lives_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000000a1', 'S03 normal', 'd', 'Other', 'low') $$,
  'TC-S03-1: user can create a ticket for themselves'
);

select is(
  (select status from public.tickets where title = 'S03 normal'),
  'open',
  'TC-S03-2: new ticket status defaults to open'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority, status)
     values ('00000000-0000-0000-0000-0000000000a1', 'S03 closed', 'd', 'Other', 'low', 'closed') $$,
  '23514', null,
  'TC-S03-3: inserting a ticket as closed is rejected'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority, status)
     values ('00000000-0000-0000-0000-0000000000a1', 'S03 resolved', 'd', 'Other', 'low', 'resolved') $$,
  '23514', null,
  'TC-S03-4: inserting a ticket as resolved is rejected'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000000b2', 'S03 impersonation', 'd', 'Other', 'low') $$,
  '42501', null,
  'TC-S03-5: inserting a ticket for another user is rejected'
);

insert into public.tickets
  (user_id, title, description, category, priority, created_at, updated_at, resolved_at, closed_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'S03 tampered', 'd', 'Other', 'low',
   '2000-01-01', '2000-01-01', '2000-01-02', '2000-01-03');

select is(
  (select created_at from public.tickets where title = 'S03 tampered'),
  now(),
  'TC-S03-6: client-supplied created_at is replaced by the database time'
);

select is(
  (select updated_at from public.tickets where title = 'S03 tampered'),
  now(),
  'TC-S03-7: client-supplied updated_at is replaced by the database time'
);

select is(
  (select resolved_at from public.tickets where title = 'S03 tampered'),
  null,
  'TC-S03-8: client-supplied resolved_at is cleared'
);

select is(
  (select closed_at from public.tickets where title = 'S03 tampered'),
  null,
  'TC-S03-9: client-supplied closed_at is cleared'
);

select * from finish();
rollback;
