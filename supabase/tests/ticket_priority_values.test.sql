begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c3', 'fr7-user@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'fr7-staff@test.local');
insert into public.users (user_id, name, email, role) values
  ('00000000-0000-0000-0000-0000000000c3', 'FR7 User', 'fr7-user@test.local', 'user'),
  ('00000000-0000-0000-0000-0000000000d4', 'FR7 Staff', 'fr7-staff@test.local', 'staff')
on conflict (user_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);

select lives_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority) values
       ('00000000-0000-0000-0000-0000000000c3', 'FR7 low', 'd', 'Other', 'low'),
       ('00000000-0000-0000-0000-0000000000c3', 'FR7 medium', 'd', 'Other', 'medium'),
       ('00000000-0000-0000-0000-0000000000c3', 'FR7 high', 'd', 'Other', 'high'),
       ('00000000-0000-0000-0000-0000000000c3', 'FR7 critical', 'd', 'Other', 'critical') $$,
  'TC-FR7-1: tickets can be created with low, medium, high and critical priority'
);

select is(
  (select priority from public.tickets where title = 'FR7 critical'),
  'critical',
  'TC-FR7-2: critical priority is stored on creation'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000000c3', 'FR7 urgent', 'd', 'Other', 'urgent') $$,
  '23514', null,
  'TC-FR7-3: the retired urgent priority is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d4', true);

select lives_ok(
  $$ update public.tickets set priority = 'critical' where title = 'FR7 low' $$,
  'TC-FR7-4: staff can update a ticket priority to critical'
);

select is(
  (select priority from public.tickets where title = 'FR7 low'),
  'critical',
  'TC-FR7-5: updated critical priority is persisted'
);

select throws_ok(
  $$ update public.tickets set priority = 'urgent' where title = 'FR7 medium' $$,
  '23514', null,
  'TC-FR7-6: staff cannot update a ticket priority to urgent'
);

select is(
  (select count(*)::int from public.tickets where priority = 'urgent'),
  0,
  'TC-FR7-7: no tickets have the retired urgent priority'
);

select * from finish();
rollback;
