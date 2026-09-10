import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { getMyTickets } from "../../services/ticketService";
import { filterTickets, type StatusFilter } from "../ticketFilters";
import type { Ticket } from "../../types/database";

export type { StatusFilter };

export interface MyTicketsController {
  tickets: Ticket[];
  hasTickets: boolean;
  isLoading: boolean;
  searchTerm: string;
  statusFilter: StatusFilter;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

export function useMyTicketsController(): MyTicketsController {
  const { user } = useAuth();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    getMyTickets(user.id)
      .then(setAllTickets)
      .catch(() => setAllTickets([]))
      .finally(() => setIsLoading(false));
  }, [user]);

  const tickets = useMemo(
    () => filterTickets(allTickets, searchTerm, statusFilter),
    [allTickets, searchTerm, statusFilter],
  );

  return {
    tickets,
    hasTickets: allTickets.length > 0,
    isLoading,
    searchTerm,
    statusFilter,
    setSearchTerm,
    setStatusFilter,
  };
}
