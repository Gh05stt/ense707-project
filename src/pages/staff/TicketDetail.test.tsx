import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeStaffProfile, makeTicket } from "../../test/fixtures";
import TicketDetail from "./TicketDetail";

vi.mock("../../services/ticketService", () => ({
  getTicketById: vi.fn(),
  getResolutionNotes: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeStaffProfile()),
}));

import { getResolutionNotes, getTicketById } from "../../services/ticketService";

const getTicketByIdMock = vi.mocked(getTicketById);
const getResolutionNotesMock = vi.mocked(getResolutionNotes);

function renderTicketDetail(ticketId: number) {
  return render(
    <MemoryRouter initialEntries={[`/staff/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/staff/tickets/:ticketId" element={<TicketDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetail page", () => {
  beforeEach(() => {
    getTicketByIdMock.mockReset();
    getResolutionNotesMock.mockReset();
    getResolutionNotesMock.mockResolvedValue([]);
  });

  it("TC-5 - FR-3: displays the current status of the opened ticket", async () => {
    const ticket = makeTicket({ ticket_id: 55, title: "VPN not connecting", status: "resolved" });
    getTicketByIdMock.mockResolvedValue(ticket);

    renderTicketDetail(55);

    expect(await screen.findByText("VPN not connecting")).toBeInTheDocument();

    const [, statusSelect] = screen.getAllByRole("combobox");
    expect(statusSelect).toHaveValue(ticket.status);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("TC-7 - NFR-2 supporting check: ticket information replaces the loading indicator once available", async () => {
    let resolveTicket!: (ticket: ReturnType<typeof makeTicket>) => void;
    getTicketByIdMock.mockReturnValue(
      new Promise((resolve) => {
        resolveTicket = resolve;
      }),
    );

    renderTicketDetail(77);

    expect(screen.getByText(/loading ticket/i)).toBeInTheDocument();

    resolveTicket(makeTicket({ ticket_id: 77, title: "Loaded ticket detail" }));

    expect(await screen.findByText("Loaded ticket detail")).toBeInTheDocument();
    expect(screen.queryByText(/loading ticket/i)).not.toBeInTheDocument();
  });
});
