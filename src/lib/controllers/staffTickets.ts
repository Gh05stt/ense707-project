import { useEffect, useMemo, useState } from "react";

import { getAllTickets } from "../../services/ticketService";
import type { Ticket, TicketStatus } from "../../types/database";

export type StatusFilter = TicketStatus | "all";

export interface StaffTicketsController {
  tickets: Ticket[];
  isLoading: boolean;
  searchTerm: string;
  statusFilter: StatusFilter;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

export function useStaffTicketsController(): StaffTicketsController {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    getAllTickets()
      .then(setAllTickets)
      .catch(() => setAllTickets([]))
      .finally(() => setIsLoading(false));
  }, []);

  const tickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allTickets.filter((ticket) => {
      const matchesSearch =
        !term || ticket.title.toLowerCase().includes(term) || String(ticket.ticket_id).includes(term);
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTickets, searchTerm, statusFilter]);

  return { tickets, isLoading, searchTerm, statusFilter, setSearchTerm, setStatusFilter };
}
