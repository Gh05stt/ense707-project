import { supabase } from "../lib/supabaseClient";
import { TicketValidationError, validateCreateTicketInput } from "../lib/ticketValidation";
import type { CreateTicketInput, ResolutionNote, Ticket, TicketPriority, TicketStatus } from "../types/database";

const TICKET_WITH_REQUESTER_SELECT = "*, users ( user_id, name, email )";
const NOTE_WITH_AUTHOR_SELECT = "*, users ( user_id, name, email )";

export async function createTicket(userId: string, input: CreateTicketInput): Promise<Ticket> {
  const fieldErrors = validateCreateTicketInput(input);
  if (Object.keys(fieldErrors).length > 0) throw new TicketValidationError(fieldErrors);

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
    })
    .select(TICKET_WITH_REQUESTER_SELECT)
    .single();

  if (error) throw error;
  return data as Ticket;
}

export async function getMyTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Ticket[];
}

export async function getAllTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_WITH_REQUESTER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Ticket[];
}

export async function getTicketById(ticketId: number): Promise<Ticket> {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_WITH_REQUESTER_SELECT)
    .eq("ticket_id", ticketId)
    .single();

  if (error) throw error;
  return data as Ticket;
}

async function updateTicket(ticketId: number, updates: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase
    .from("tickets")
    .update(updates)
    .eq("ticket_id", ticketId)
    .select("ticket_id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Ticket ${ticketId} was not updated. It may not exist or you may not have permission to change it.`);
  }
}

export async function updateTicketStatus(ticketId: number, status: TicketStatus): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === "resolved") updates.resolved_at = new Date().toISOString();
  if (status === "closed") updates.closed_at = new Date().toISOString();

  await updateTicket(ticketId, updates);
}

export async function updateTicketPriority(ticketId: number, priority: TicketPriority): Promise<void> {
  await updateTicket(ticketId, { priority });
}

export async function getResolutionNotes(ticketId: number): Promise<ResolutionNote[]> {
  const { data, error } = await supabase
    .from("resolution_notes")
    .select(NOTE_WITH_AUTHOR_SELECT)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ResolutionNote[];
}

export async function addResolutionNote(ticketId: number, staffUserId: string, noteText: string): Promise<void> {
  const { error } = await supabase.from("resolution_notes").insert({
    ticket_id: ticketId,
    staff_user_id: staffUserId,
    note_text: noteText,
  });

  if (error) throw error;
}
