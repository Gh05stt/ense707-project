-- S-03: new tickets always start in a clean 'open' state owned by the caller.
-- Lifecycle timestamps are owned by the database, so client-supplied values
-- for them are ignored rather than rejected.

create or replace function public.enforce_new_ticket_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'Tickets can only be created for the authenticated user'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from 'open' then
    raise exception 'New tickets must have status "open" (received "%")', new.status
      using errcode = 'check_violation',
            hint = 'Omit status when creating a ticket; it defaults to open.';
  end if;

  new.created_at := now();
  new.updated_at := now();
  new.resolved_at := null;
  new.closed_at := null;

  return new;
end;
$$;

create or replace trigger enforce_new_ticket_defaults
  before insert on public.tickets
  for each row
  execute function public.enforce_new_ticket_defaults();
