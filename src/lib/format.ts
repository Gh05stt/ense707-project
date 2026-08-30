import type { TicketPriority, TicketStatus } from "../types/database";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function formatStatus(status: TicketStatus): string {
  return STATUS_LABELS[status];
}

export function formatPriority(priority: TicketPriority): string {
  return PRIORITY_LABELS[priority];
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

export function formatTicketId(ticketId: number): string {
  return `SQA-${String(ticketId).padStart(4, "0")}`;
}
