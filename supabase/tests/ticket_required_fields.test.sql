begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000013a1', 'fr13-user@test.local');
insert into public.users (user_id, name, email, role) values
  ('00000000-0000-0000-0000-0000000013a1', 'FR13 User', 'fr13-user@test.local', 'user')
on conflict (user_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000013a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000013a1', true);

select lives_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', 'FR13 valid', 'Printer offline', 'Other', 'critical') $$,
  'TC-FR13-DB-1: a ticket with non-blank fields is accepted'
);

select lives_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', 'x', 'y', 'Other', 'low') $$,
  'TC-FR13-DB-2: single-character title and description are accepted'
);

select lives_ok(
  format(
    $$ insert into public.tickets (user_id, title, description, category, priority)
       values ('00000000-0000-0000-0000-0000000013a1', %L, %L, 'Other', 'low') $$,
    repeat('t', 1000), repeat('d', 100000)
  ),
  'TC-FR13-DB-3: long title and description are accepted (no length limit in the schema)'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', '', 'd', 'Other', 'low') $$,
  '23514', null,
  'TC-FR13-DB-4: empty title is rejected'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', E'  \n\t ', 'd', 'Other', 'low') $$,
  '23514', null,
  'TC-FR13-DB-5: whitespace-only title is rejected'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', 't', E'\n\n  \r\n', 'Other', 'low') $$,
  '23514', null,
  'TC-FR13-DB-6: whitespace-only description is rejected'
);

select throws_ok(
  $$ insert into public.tickets (user_id, title, description, category, priority)
     values ('00000000-0000-0000-0000-0000000013a1', 't', 'd', '   ', 'low') $$,
  '23514', null,
  'TC-FR13-DB-7: blank category is rejected'
);

reset role;

select throws_ok(
  $$ update public.tickets set title = '   ' where title = 'FR13 valid' $$,
  '23514', null,
  'TC-FR13-DB-8: a title cannot be blanked by a later update'
);

select * from finish();
rollback;
