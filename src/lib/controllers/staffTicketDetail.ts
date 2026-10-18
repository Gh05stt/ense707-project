import { type FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import {
  addResolutionNote,
  getResolutionNotes,
  getTicketById,
  updateTicketPriority,
  updateTicketStatus,
} from "../../services/ticketService";
import type { ResolutionNote, Ticket, TicketPriority, TicketStatus } from "../../types/database";

export interface StaffTicketDetailController {
  ticket: Ticket | null;
  notes: ResolutionNote[];
  isLoading: boolean;
  loadError: string | null;
  isUpdating: boolean;
  updateError: string | null;
  canClose: boolean;
  noteText: string;
  isAddingNote: boolean;
  noteError: string | null;
  setNoteText: (value: string) => void;
  handleStatusChange: (status: TicketStatus) => Promise<void>;
  handlePriorityChange: (priority: TicketPriority) => Promise<void>;
  handleAddNote: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useStaffTicketDetailController(ticketId: number): StaffTicketDetailController {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<ResolutionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    try {
      const [ticketData, notesData] = await Promise.all([getTicketById(ticketId), getResolutionNotes(ticketId)]);
      setTicket(ticketData);
      setNotes(notesData);
      setLoadError(null);
    } catch {
      setLoadError("Failed to load this ticket.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // only close a ticket if its resolved
  const canClose = ticket?.status === "resolved";

  async function handleStatusChange(status: TicketStatus) {
    if (status === "closed" && !canClose) return;

    setIsUpdating(true);
    setUpdateError(null);
    try {
      await updateTicketStatus(ticketId, status);
      await loadTicket();
    } catch {
      setUpdateError("Failed to update the ticket status. The change was not saved.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handlePriorityChange(priority: TicketPriority) {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await updateTicketPriority(ticketId, priority);
      await loadTicket();
    } catch {
      setUpdateError("Failed to update the ticket priority. The change was not saved.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim() || !user) return;

    setIsAddingNote(true);
    setNoteError(null);
    try {
      await addResolutionNote(ticketId, user.id, noteText.trim());
      setNoteText("");
      await loadTicket();
    } catch {
      setNoteError("Failed to save the note. Please try again.");
    } finally {
      setIsAddingNote(false);
    }
  }

  return {
    ticket,
    notes,
    isLoading,
    loadError,
    isUpdating,
    updateError,
    canClose,
    noteText,
    isAddingNote,
    noteError,
    setNoteText,
    handleStatusChange,
    handlePriorityChange,
    handleAddNote,
  };
}
