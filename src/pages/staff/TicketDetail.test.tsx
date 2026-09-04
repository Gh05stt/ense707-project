import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeStaffProfile, makeTicket } from "../../test/fixtures";
import TicketDetail from "./TicketDetail";

vi.mock("../../services/ticketService", () => ({
  getTicketById: vi.fn(),
  getResolutionNotes: vi.fn(),
  updateTicketPriority: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeStaffProfile()),
}));

import { getResolutionNotes, getTicketById, updateTicketPriority } from "../../services/ticketService";

const getTicketByIdMock = vi.mocked(getTicketById);
const getResolutionNotesMock = vi.mocked(getResolutionNotes);
const updateTicketPriorityMock = vi.mocked(updateTicketPriority);

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
    updateTicketPriorityMock.mockReset();
  });

  it("TC-FR7-10: staff priority options are Low, Medium, High and Critical", async () => {
    getTicketByIdMock.mockResolvedValue(makeTicket({ ticket_id: 60, title: "Priority options", priority: "medium" }));

    renderTicketDetail(60);

    expect(await screen.findByText("Priority options")).toBeInTheDocument();
    const [prioritySelect] = screen.getAllByRole("combobox");
    const options = within(prioritySelect).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Low", "Medium", "High", "Critical"]);
  });

  it("TC-FR7-11: staff can change priority to Critical and the saved value is displayed", async () => {
    getTicketByIdMock
      .mockResolvedValueOnce(makeTicket({ ticket_id: 61, title: "Escalate me", priority: "low" }))
      .mockResolvedValue(makeTicket({ ticket_id: 61, title: "Escalate me", priority: "critical" }));
    updateTicketPriorityMock.mockResolvedValue();

    renderTicketDetail(61);

    expect(await screen.findByText("Escalate me")).toBeInTheDocument();
    const [prioritySelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(prioritySelect, "critical");

    expect(updateTicketPriorityMock).toHaveBeenCalledWith(61, "critical");
    await waitFor(() => expect(screen.getAllByRole("combobox")[0]).toHaveValue("critical"));
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
