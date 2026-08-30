import { useEffect, useState } from "react";

import { getAllTickets } from "../../services/ticketService";
import type { Ticket } from "../../types/database";

export interface KpiWidgetData {
  title: string;
  value: number;
}

export interface StaffDashboardController {
  kpiWidgets: KpiWidgetData[];
  isLoading: boolean;
}

// Tickets longer than this are overdue
const OVERDUE_THRESHOLD_HOURS = 48;

function isOverdue(ticket: Ticket): boolean {
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
  return ageHours > OVERDUE_THRESHOLD_HOURS;
}

function averageResolutionHours(tickets: Ticket[]): number {
  const resolved = tickets.filter((ticket) => ticket.resolved_at);
  if (resolved.length === 0) return 0;

  const totalHours = resolved.reduce((sum, ticket) => {
    const createdAt = new Date(ticket.created_at).getTime();
    const resolvedAt = new Date(ticket.resolved_at as string).getTime();
    return sum + (resolvedAt - createdAt) / (1000 * 60 * 60);
  }, 0);

  return totalHours / resolved.length;
}

export function useStaffDashboardController(): StaffDashboardController {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllTickets()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setIsLoading(false));
  }, []);

  const kpiWidgets: KpiWidgetData[] = [
    { title: "Total Number of Tickets", value: tickets.length },
    { title: "Overdue Tickets", value: tickets.filter(isOverdue).length },
    { title: "In Progress Tickets", value: tickets.filter((t) => t.status === "in_progress").length },
    { title: "Avg. Time to Close (hrs)", value: Math.round(averageResolutionHours(tickets)) },
    { title: "Open Tickets", value: tickets.filter((t) => t.status === "open").length },
  ];

  return { kpiWidgets, isLoading };
}
