import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { createTicket, updateTicketPriority, updateTicketStatus } from "./ticketService";

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
