import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeStaffProfile, makeTicket } from "../../test/fixtures";
import StaffTickets from "./Tickets";

vi.mock("../../services/ticketService", () => ({
  getAllTickets: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeStaffProfile()),
}));

import { getAllTickets } from "../../services/ticketService";

const getAllTicketsMock = vi.mocked(getAllTickets);

function renderStaffTickets() {
  return render(
    <MemoryRouter>
      <StaffTickets />
    </MemoryRouter>,
  );
}

describe("StaffTickets page", () => {
  beforeEach(() => {
    getAllTicketsMock.mockReset();
  });

  it("TC-4 - FR-4: displays submitted tickets with their key information", async () => {
    const tickets = [
      makeTicket({
        ticket_id: 101,
        title: "Cannot access shared drive",
        category: "Access Request",
        priority: "high",
        status: "open",
        users: { user_id: "user-1", name: "Alice Requester", email: "alice@example.com" },
      }),
      makeTicket({
        ticket_id: 102,
        title: "Printer offline",
        category: "Network Problem",
        priority: "low",
        status: "in_progress",
        users: { user_id: "user-2", name: "Bob Requester", email: "bob@example.com" },
      }),
    ];
    getAllTicketsMock.mockResolvedValue(tickets);

    renderStaffTickets();

    expect(await screen.findByText("Cannot access shared drive")).toBeInTheDocument();
    expect(screen.getByText("Printer offline")).toBeInTheDocument();

    const firstRow = screen.getByText("Cannot access shared drive").closest("tr");
    expect(firstRow).not.toBeNull();
    expect(within(firstRow as HTMLElement).getByText("SQA-0101")).toBeInTheDocument();
    expect(within(firstRow as HTMLElement).getByText("Access Request")).toBeInTheDocument();
    expect(within(firstRow as HTMLElement).getByText("High")).toBeInTheDocument();
    expect(within(firstRow as HTMLElement).getByText("Open")).toBeInTheDocument();
    expect(within(firstRow as HTMLElement).getByText("Alice Requester")).toBeInTheDocument();
  });

  it("TC-3 - FR-2: renders each ticket with a distinct ticket ID", async () => {
    const tickets = [makeTicket({ ticket_id: 201, title: "First ticket" }), makeTicket({ ticket_id: 202, title: "Second ticket" })];
    getAllTicketsMock.mockResolvedValue(tickets);

    renderStaffTickets();

    const firstLink = await screen.findByRole("link", { name: "SQA-0201" });
    const secondLink = await screen.findByRole("link", { name: "SQA-0202" });

    expect(firstLink).toHaveAttribute("href", "/staff/tickets/201");
    expect(secondLink).toHaveAttribute("href", "/staff/tickets/202");
    expect(firstLink.getAttribute("href")).not.toEqual(secondLink.getAttribute("href"));
  });
});
