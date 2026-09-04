import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { createTicket } from "./ticketService";

const fromMock = vi.mocked(supabase.from);
const insertMock = vi.fn();

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
