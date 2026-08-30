import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { getMyTickets } from "../../services/ticketService";
import type { Ticket } from "../../types/database";
import type { KpiWidgetData } from "./staffDashboard";

function countByStatus(tickets: Ticket[], status: Ticket["status"]): number {
  return tickets.filter((ticket) => ticket.status === status).length;
}

export interface UserDashboardController {
  kpiWidgets: KpiWidgetData[];
}

export function useUserDashboardController(): UserDashboardController {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!user) return;
    getMyTickets(user.id)
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [user]);

  const kpiWidgets: KpiWidgetData[] = [
    { title: "Total Tickets Submitted", value: tickets.length },
    { title: "Open Tickets", value: countByStatus(tickets, "open") },
    { title: "In Progress Tickets", value: countByStatus(tickets, "in_progress") },
    { title: "Resolved Tickets", value: countByStatus(tickets, "resolved") },
    { title: "Closed Tickets", value: countByStatus(tickets, "closed") },
  ];

  return { kpiWidgets };
}
