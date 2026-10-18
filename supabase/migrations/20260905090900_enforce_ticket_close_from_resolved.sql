create or replace function public.enforce_ticket_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'closed' and old.status <> 'resolved' then
      raise exception 'Ticket % cannot be closed from status "%"; it must be resolved first (FR-10)',
        old.ticket_id, old.status
        using errcode = 'check_violation',
              hint = 'Set the ticket status to resolved before closing it.';
    end if;

    case new.status
      when 'resolved' then
        new.resolved_at := now();
        new.closed_at := null;
      when 'closed' then
        new.resolved_at := old.resolved_at;
        new.closed_at := now();
      else
        new.resolved_at := null;
        new.closed_at := null;
    end case;
  else
    new.resolved_at := old.resolved_at;
    new.closed_at := old.closed_at;
  end if;

  return new;
end;
$$;

create or replace trigger enforce_ticket_status_transition
  before update on public.tickets
  for each row
  execute function public.enforce_ticket_status_transition();
