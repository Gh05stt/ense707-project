
-- preview what would be deleted
select ticket_id, title, left(description, 60) as description, status, created_at
from public.tickets
where title like 'INTEGTEST-RUNID %' or description like 'INTEGTEST-RUNID %'
order by ticket_id;

select count(*) as notes_removed_by_cascade
from public.resolution_notes
where ticket_id in (
  select ticket_id from public.tickets
  where title like 'INTEGTEST-RUNID %' or description like 'INTEGTEST-RUNID %'
);

-- delete data: set expected_tickets to the step 1 row count, then run this.
do $$
declare
  expected_tickets int := 0;
  deleted_tickets int;
begin
  delete from public.tickets
  where title like 'INTEGTEST-RUNID %' or description like 'INTEGTEST-RUNID %';
  get diagnostics deleted_tickets = row_count;

  if deleted_tickets <> expected_tickets then
    raise exception 'Deleted % tickets but expected %; nothing was deleted', deleted_tickets, expected_tickets;
  end if;
  raise notice 'Deleted % integration-test tickets', deleted_tickets;
end;
$$;

-- confirm no tickets remain
select count(*) as remaining_tickets
from public.tickets
where title like 'INTEGTEST-RUNID %' or description like 'INTEGTEST-RUNID %';
