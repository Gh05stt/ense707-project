import { useEffect, useState } from "react";

import { getAllTickets } from "../../services/ticketService";
import type { Ticket } from "../../types/database";

export interface KpiWidgetData {
  title: string;
  value: number | string;
}

export interface DashboardKpis {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  overdue: number;
  total: number;
  averageResolutionHours: number | null;
}

export interface StaffDashboardController {
  kpiWidgets: KpiWidgetData[];
  isLoading: boolean;
  loadError: string | null;
}

export const OVERDUE_THRESHOLD_HOURS = 48;

const MS_PER_HOUR = 1000 * 60 * 60;

function isUnresolved(ticket: Ticket): boolean {
  return ticket.status === "open" || ticket.status === "in_progress";
}

function isOverdue(ticket: Ticket, now: number): boolean {
  if (!isUnresolved(ticket)) return false;
  return (now - new Date(ticket.created_at).getTime()) / MS_PER_HOUR > OVERDUE_THRESHOLD_HOURS;
}

function averageResolutionHours(tickets: Ticket[]): number | null {
  const resolved = tickets.filter((ticket) => !isUnresolved(ticket) && ticket.resolved_at);
  if (resolved.length === 0) return null;

  const totalHours = resolved.reduce((sum, ticket) => {
    const createdAt = new Date(ticket.created_at).getTime();
    const resolvedAt = new Date(ticket.resolved_at as string).getTime();
    return sum + (resolvedAt - createdAt) / MS_PER_HOUR;
  }, 0);

  return totalHours / resolved.length;
}

export function calculateDashboardKpis(tickets: Ticket[], now: number = Date.now()): DashboardKpis {
  const countStatus = (status: Ticket["status"]) => tickets.filter((ticket) => ticket.status === status).length;

  return {
    open: countStatus("open"),
    inProgress: countStatus("in_progress"),
    resolved: countStatus("resolved"),
    closed: countStatus("closed"),
    overdue: tickets.filter((ticket) => isOverdue(ticket, now)).length,
    total: tickets.length,
    averageResolutionHours: averageResolutionHours(tickets),
  };
}

function toKpiWidgets(kpis: DashboardKpis): KpiWidgetData[] {
  const average = kpis.averageResolutionHours;

  return [
    { title: "Open Tickets", value: kpis.open },
    { title: "In Progress Tickets", value: kpis.inProgress },
    { title: "Resolved Tickets", value: kpis.resolved },
    { title: "Closed Tickets", value: kpis.closed },
    { title: `Overdue Tickets (> ${OVERDUE_THRESHOLD_HOURS} hrs)`, value: kpis.overdue },
    { title: "Avg. Resolution Time (hrs)", value: average === null ? "N/A" : Math.round(average * 10) / 10 },
    { title: "Total Number of Tickets", value: kpis.total },
  ];
}

export function useStaffDashboardController(): StaffDashboardController {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getAllTickets()
      .then(setTickets)
      .catch(() => setLoadError("Failed to load dashboard data. Please refresh the page to try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const kpiWidgets = isLoading || loadError ? [] : toKpiWidgets(calculateDashboardKpis(tickets));

  return { kpiWidgets, isLoading, loadError };
}
