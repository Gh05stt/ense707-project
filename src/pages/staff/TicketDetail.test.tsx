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
  updateTicketStatus: vi.fn(),
  addResolutionNote: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeStaffProfile()),
}));

import {
  addResolutionNote,
  getResolutionNotes,
  getTicketById,
  updateTicketPriority,
  updateTicketStatus,
} from "../../services/ticketService";

const getTicketByIdMock = vi.mocked(getTicketById);
const getResolutionNotesMock = vi.mocked(getResolutionNotes);
const updateTicketPriorityMock = vi.mocked(updateTicketPriority);
const updateTicketStatusMock = vi.mocked(updateTicketStatus);
const addResolutionNoteMock = vi.mocked(addResolutionNote);

const ZERO_ROW_ERROR = new Error(
  "Ticket 70 was not updated. It may not exist or you may not have permission to change it.",
);

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
    updateTicketStatusMock.mockReset();
    addResolutionNoteMock.mockReset();
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

  describe("failed updates (error handling)", () => {
    const getSelects = () => {
      const [prioritySelect, statusSelect] = screen.getAllByRole("combobox");
      return { prioritySelect, statusSelect };
    };

    it("TC-ERR-03: a failed status update shows an error and keeps the saved status", async () => {
      getTicketByIdMock.mockResolvedValue(makeTicket({ ticket_id: 70, title: "Status fails", status: "open" }));
      updateTicketStatusMock.mockRejectedValue(ZERO_ROW_ERROR);

      renderTicketDetail(70);
      await screen.findByText("Status fails");
      await userEvent.selectOptions(getSelects().statusSelect, "in_progress");

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to update the ticket status/i);
      expect(updateTicketStatusMock).toHaveBeenCalledWith(70, "in_progress");
      expect(getSelects().statusSelect).toHaveValue("open");
      expect(getSelects().statusSelect).toBeEnabled();
    });

    it("TC-ERR-04: a failed priority update shows an error and keeps the saved priority", async () => {
      getTicketByIdMock.mockResolvedValue(makeTicket({ ticket_id: 70, title: "Priority fails", priority: "low" }));
      updateTicketPriorityMock.mockRejectedValue(ZERO_ROW_ERROR);

      renderTicketDetail(70);
      await screen.findByText("Priority fails");
      await userEvent.selectOptions(getSelects().prioritySelect, "critical");

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to update the ticket priority/i);
      expect(getSelects().prioritySelect).toHaveValue("low");
      expect(getSelects().prioritySelect).toBeEnabled();
    });

    it("TC-ERR-05: after a failed priority update, a successful retry clears the error", async () => {
      getTicketByIdMock
        .mockResolvedValueOnce(makeTicket({ ticket_id: 70, title: "Retry priority", priority: "low" }))
        .mockResolvedValue(makeTicket({ ticket_id: 70, title: "Retry priority", priority: "high" }));
      updateTicketPriorityMock.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce();

      renderTicketDetail(70);
      await screen.findByText("Retry priority");
      await userEvent.selectOptions(getSelects().prioritySelect, "high");
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await userEvent.selectOptions(getSelects().prioritySelect, "high");

      await waitFor(() => expect(getSelects().prioritySelect).toHaveValue("high"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(updateTicketPriorityMock).toHaveBeenCalledTimes(2);
    });

    it("TC-ERR-06: a failed note shows an error and keeps the typed text", async () => {
      getTicketByIdMock.mockResolvedValue(makeTicket({ ticket_id: 70, title: "Note fails" }));
      addResolutionNoteMock.mockRejectedValue(new Error("permission denied"));

      renderTicketDetail(70);
      await screen.findByText("Note fails");
      await userEvent.type(screen.getByPlaceholderText("Add a note..."), "Restarted the router");
      await userEvent.click(screen.getByRole("button", { name: "Add Note" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/failed to save the note/i);
      expect(addResolutionNoteMock).toHaveBeenCalledWith(70, "staff-1", "Restarted the router");
      expect(screen.getByPlaceholderText("Add a note...")).toHaveValue("Restarted the router");
      expect(screen.getByRole("button", { name: "Add Note" })).toBeEnabled();
      expect(screen.getByText("No resolution notes yet.")).toBeInTheDocument();
    });

    it("TC-ERR-07: after a failed note, a successful retry clears the error and the text", async () => {
      getTicketByIdMock.mockResolvedValue(makeTicket({ ticket_id: 70, title: "Retry note" }));
      addResolutionNoteMock.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce();

      renderTicketDetail(70);
      await screen.findByText("Retry note");
      await userEvent.type(screen.getByPlaceholderText("Add a note..."), "Replaced cable");
      await userEvent.click(screen.getByRole("button", { name: "Add Note" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Add Note" }));

      await waitFor(() => expect(screen.getByPlaceholderText("Add a note...")).toHaveValue(""));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(addResolutionNoteMock).toHaveBeenCalledTimes(2);
    });
  });
});
