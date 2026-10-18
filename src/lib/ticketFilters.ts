import type { Ticket, TicketStatus } from "../types/database";

export type StatusFilter = TicketStatus | "all";

const TICKET_ID_QUERY = /^(?:sqa-?)?0*(\d+)$/i;

export function parseTicketIdQuery(term: string): number | null {
  const match = TICKET_ID_QUERY.exec(term.trim());
  return match ? Number(match[1]) : null;
}

export function matchesSearch(ticket: Ticket, searchTerm: string): boolean {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  return ticket.ticket_id === parseTicketIdQuery(term) || ticket.title.toLowerCase().includes(term);
}

export function filterTickets(tickets: Ticket[], searchTerm: string, statusFilter: StatusFilter): Ticket[] {
  return tickets.filter(
    (ticket) => (statusFilter === "all" || ticket.status === statusFilter) && matchesSearch(ticket, searchTerm),
  );
}
