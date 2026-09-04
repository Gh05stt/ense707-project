-- FR-7: priority values are Low, Medium, High and Critical.
-- Existing 'urgent' tickets become 'critical'; all other values are untouched.
-- updated_at is preserved because this is a data correction, not a ticket edit.

alter table public.tickets drop constraint tickets_priority_check;

alter table public.tickets disable trigger update_tickets_updated_at;

update public.tickets
set priority = 'critical'
where priority = 'urgent';

alter table public.tickets enable trigger update_tickets_updated_at;

alter table public.tickets
  add constraint tickets_priority_check
  check (priority = any (array['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));
