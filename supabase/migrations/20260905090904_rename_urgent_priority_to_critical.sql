alter table public.tickets drop constraint tickets_priority_check;

alter table public.tickets disable trigger update_tickets_updated_at;

update public.tickets
set priority = 'critical'
where priority = 'urgent';

alter table public.tickets enable trigger update_tickets_updated_at;

alter table public.tickets
  add constraint tickets_priority_check
  check (priority = any (array['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));
