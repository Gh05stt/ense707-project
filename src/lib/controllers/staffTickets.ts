import { useEffect, useMemo, useState } from "react";

import { getAllTickets } from "../../services/ticketService";
import { filterTickets, type StatusFilter } from "../ticketFilters";
import type { Ticket } from "../../types/database";

export type { StatusFilter };

export interface StaffTicketsController {
  tickets: Ticket[];
  isLoading: boolean;
  loadError: string | null;
  searchTerm: string;
  statusFilter: StatusFilter;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

export function useStaffTicketsController(): StaffTicketsController {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    getAllTickets()
      .then(setAllTickets)
      .catch(() => setLoadError("Failed to load tickets. Please refresh the page to try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const tickets = useMemo(
    () => filterTickets(allTickets, searchTerm, statusFilter),
    [allTickets, searchTerm, statusFilter],
  );

  return { tickets, isLoading, loadError, searchTerm, statusFilter, setSearchTerm, setStatusFilter };
}
