export type UserRole = "user" | "staff" | "admin";

export interface Profile {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketRequester {
  user_id: string;
  name: string;
  email: string;
}

export interface Ticket {
  ticket_id: number;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  users?: TicketRequester | null;
}

export interface ResolutionNote {
  note_id: number;
  ticket_id: number;
  staff_user_id: string;
  note_text: string;
  created_at: string;
  users?: TicketRequester | null;
}

export interface CreateTicketInput {
  title: string;
  category: string;
  priority: TicketPriority | "";
  description: string;
}
