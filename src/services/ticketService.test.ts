import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { TicketValidationError } from "../lib/ticketValidation";
import {
  addResolutionNote,
  createTicket,
  getAllTickets,
  getMyTickets,
  getResolutionNotes,
  getTicketById,
  updateTicketPriority,
  updateTicketStatus,
} from "./ticketService";
import { makeResolutionNote, makeTicket } from "../test/fixtures";

const fromMock = vi.mocked(supabase.from);
const insertMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();

function mockUpdateResult(result: { data: unknown; error: unknown }) {
  selectMock.mockResolvedValue(result);
  eqMock.mockReturnValue({ select: selectMock });
  updateMock.mockReturnValue({ eq: eqMock });
  fromMock.mockReturnValue({ update: updateMock } as unknown as ReturnType<typeof supabase.from>);
}

function mockInsertResult(result: { data: unknown; error: unknown }) {
  insertMock.mockReturnValue({
    select: () => ({ single: () => Promise.resolve(result) }),
  });
  fromMock.mockReturnValue({ insert: insertMock } as unknown as ReturnType<typeof supabase.from>);
}

const VALID_INPUT = {
  title: "Cannot log in",
  description: "Password rejected",
  category: "Login Issue",
  priority: "high" as const,
};

describe("ticketService.createTicket (S-03)", () => {
  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
  });

  it("TC-S03-10: sends only requester-owned fields, leaving status and timestamps to the database", async () => {
    mockInsertResult({ data: { ticket_id: 1 }, error: null });

    await createTicket("user-1", VALID_INPUT);

    expect(fromMock).toHaveBeenCalledWith("tickets");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Cannot log in",
      description: "Password rejected",
      category: "Login Issue",
      priority: "high",
    });
  });

  it("TC-S03-11: surfaces database rejections to the caller", async () => {
    const dbError = { code: "23514", message: 'New tickets must have status "open"' };
    mockInsertResult({ data: null, error: dbError });

    await expect(createTicket("user-1", VALID_INPUT)).rejects.toBe(dbError);
  });
});

describe("ticketService.createTicket validation (FR-13)", () => {
  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
  });

  it.each([
    ["missing title", { title: "" }, "title"],
    ["whitespace-only title", { title: " \n\t " }, "title"],
    ["missing description", { description: "" }, "description"],
    ["whitespace-only description", { description: "\n\n  " }, "description"],
    ["missing category", { category: "" }, "category"],
    ["unknown category", { category: "Hardware" }, "category"],
    ["missing priority", { priority: "" }, "priority"],
    ["legacy urgent priority", { priority: "urgent" }, "priority"],
  ])("TC-FR13-9: rejects %s without calling Supabase", async (_case, override, field) => {
    const input = { ...VALID_INPUT, ...override } as unknown as typeof VALID_INPUT;

    const result = createTicket("user-1", input);

    await expect(result).rejects.toBeInstanceOf(TicketValidationError);
    await expect(result).rejects.toHaveProperty(["fieldErrors", field]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("TC-FR13-10: trims surrounding whitespace from title and description before inserting", async () => {
    mockInsertResult({ data: { ticket_id: 1 }, error: null });

    await createTicket("user-1", { ...VALID_INPUT, title: "  Cannot log in \n", description: "\n Password rejected  " });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cannot log in", description: "Password rejected" }),
    );
  });

  it("TC-FR13-11: accepts Critical priority", async () => {
    mockInsertResult({ data: { ticket_id: 1 }, error: null });

    await createTicket("user-1", { ...VALID_INPUT, priority: "critical" });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ priority: "critical" }));
  });
});

describe("ticketService ticket updates (zero-row detection)", () => {
  beforeEach(() => {
    fromMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();
    selectMock.mockReset();
  });

  const updates = [
    ["updateTicketStatus", () => updateTicketStatus(5, "in_progress")],
    ["updateTicketPriority", () => updateTicketPriority(5, "critical")],
  ] as const;

  it.each(updates)("TC-ERR-08: %s resolves when one row is updated", async (_name, runUpdate) => {
    mockUpdateResult({ data: [{ ticket_id: 5 }], error: null });

    await expect(runUpdate()).resolves.toBeUndefined();
    expect(fromMock).toHaveBeenCalledWith("tickets");
    expect(eqMock).toHaveBeenCalledWith("ticket_id", 5);
    expect(selectMock).toHaveBeenCalledWith("ticket_id");
  });

  it.each(updates)("TC-ERR-09: %s rejects when zero rows are updated", async (_name, runUpdate) => {
    mockUpdateResult({ data: [], error: null });

    await expect(runUpdate()).rejects.toThrow(/ticket 5 was not updated/i);
  });

  it.each(updates)("TC-ERR-10: %s surfaces database errors to the caller", async (_name, runUpdate) => {
    const dbError = { code: "23514", message: "Ticket can only be closed after it has been resolved" };
    mockUpdateResult({ data: null, error: dbError });

    await expect(runUpdate()).rejects.toBe(dbError);
  });

  it("TC-ERR-11: updateTicketPriority sends only the priority field", async () => {
    mockUpdateResult({ data: [{ ticket_id: 5 }], error: null });

    await updateTicketPriority(5, "critical");

    expect(updateMock).toHaveBeenCalledWith({ priority: "critical" });
  });
});

type QueryMethod = "select" | "eq" | "order" | "single" | "insert";
type MockQuery = Promise<{ data: unknown; error: unknown }> & Record<QueryMethod, ReturnType<typeof vi.fn>>;

function mockQuery(result: { data: unknown; error: unknown }): MockQuery {
  const query = Promise.resolve(result) as MockQuery;
  for (const method of ["select", "eq", "order", "single", "insert"] as const) {
    query[method] = vi.fn(() => query);
  }
  fromMock.mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);
  return query;
}

const REQUESTER_SELECT = "*, users ( user_id, name, email )";
const RLS_ERROR = { code: "42501", message: "permission denied for table tickets" };

describe("ticketService read and note queries (mocked Supabase, not RLS verification)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe("getMyTickets", () => {
    it("TC-SVC-01: filters by the given user and returns newest tickets first", async () => {
      const tickets = [makeTicket({ ticket_id: 2 }), makeTicket({ ticket_id: 1 })];
      const query = mockQuery({ data: tickets, error: null });

      await expect(getMyTickets("user-1")).resolves.toBe(tickets);

      expect(fromMock).toHaveBeenCalledWith("tickets");
      expect(query.select).toHaveBeenCalledWith("*");
      expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("TC-SVC-02: returns an empty list when the user has no tickets", async () => {
      mockQuery({ data: [], error: null });

      await expect(getMyTickets("user-1")).resolves.toEqual([]);
    });

    it("TC-SVC-03: propagates query errors instead of returning an empty list", async () => {
      mockQuery({ data: null, error: RLS_ERROR });

      await expect(getMyTickets("user-1")).rejects.toBe(RLS_ERROR);
    });
  });

  describe("getAllTickets", () => {
    it("TC-SVC-04: selects every ticket with its requester, newest first, without a user filter", async () => {
      const tickets = [makeTicket({ ticket_id: 1 })];
      const query = mockQuery({ data: tickets, error: null });

      await expect(getAllTickets()).resolves.toBe(tickets);

      expect(fromMock).toHaveBeenCalledWith("tickets");
      expect(query.select).toHaveBeenCalledWith(REQUESTER_SELECT);
      expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(query.eq).not.toHaveBeenCalled();
    });

    it("TC-SVC-05: returns an empty list when there are no tickets", async () => {
      mockQuery({ data: [], error: null });

      await expect(getAllTickets()).resolves.toEqual([]);
    });

    it("TC-SVC-06: propagates query errors", async () => {
      mockQuery({ data: null, error: RLS_ERROR });

      await expect(getAllTickets()).rejects.toBe(RLS_ERROR);
    });
  });

  describe("getTicketById", () => {
    it("TC-SVC-07: requests exactly one ticket by ID with its requester", async () => {
      const ticket = makeTicket({ ticket_id: 42 });
      const query = mockQuery({ data: ticket, error: null });

      await expect(getTicketById(42)).resolves.toBe(ticket);

      expect(fromMock).toHaveBeenCalledWith("tickets");
      expect(query.select).toHaveBeenCalledWith(REQUESTER_SELECT);
      expect(query.eq).toHaveBeenCalledWith("ticket_id", 42);
      expect(query.single).toHaveBeenCalledTimes(1);
    });

    it("TC-SVC-08: a missing or hidden ticket rejects with the not-found error", async () => {
      const notFound = { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" };
      mockQuery({ data: null, error: notFound });

      await expect(getTicketById(999)).rejects.toBe(notFound);
    });
  });

  describe("getResolutionNotes", () => {
    it("TC-SVC-09: filters notes by ticket and returns them oldest first with their authors", async () => {
      const notes = [makeResolutionNote({ ticket_id: 42 })];
      const query = mockQuery({ data: notes, error: null });

      await expect(getResolutionNotes(42)).resolves.toBe(notes);

      expect(fromMock).toHaveBeenCalledWith("resolution_notes");
      expect(query.select).toHaveBeenCalledWith(REQUESTER_SELECT);
      expect(query.eq).toHaveBeenCalledWith("ticket_id", 42);
      expect(query.order).toHaveBeenCalledWith("created_at", { ascending: true });
    });

    it("TC-SVC-10: returns an empty list for a ticket without notes", async () => {
      mockQuery({ data: [], error: null });

      await expect(getResolutionNotes(42)).resolves.toEqual([]);
    });

    it("TC-SVC-11: propagates query errors", async () => {
      mockQuery({ data: null, error: RLS_ERROR });

      await expect(getResolutionNotes(42)).rejects.toBe(RLS_ERROR);
    });
  });

  describe("addResolutionNote", () => {
    it("TC-SVC-12: inserts the note for the ticket and staff author", async () => {
      const query = mockQuery({ data: null, error: null });

      await expect(addResolutionNote(42, "staff-1", "Replaced the cable")).resolves.toBeUndefined();

      expect(fromMock).toHaveBeenCalledWith("resolution_notes");
      expect(query.insert).toHaveBeenCalledWith({
        ticket_id: 42,
        staff_user_id: "staff-1",
        note_text: "Replaced the cable",
      });
    });

    it("TC-SVC-13: propagates insert errors such as an RLS rejection", async () => {
      const insertDenied = { code: "42501", message: 'new row violates row-level security policy for table "resolution_notes"' };
      mockQuery({ data: null, error: insertDenied });

      await expect(addResolutionNote(42, "user-1", "Not staff")).rejects.toBe(insertDenied);
    });
  });
});
