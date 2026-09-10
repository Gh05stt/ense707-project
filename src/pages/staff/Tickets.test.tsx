import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  describe("search and filter (FR-6)", () => {
    beforeEach(() => {
      getAllTicketsMock.mockResolvedValue([
        makeTicket({ ticket_id: 12, title: "VPN not connecting", status: "open" }),
        makeTicket({ ticket_id: 112, title: "Printer jam", status: "in_progress" }),
        makeTicket({ ticket_id: 120, title: "VPN drops hourly", status: "resolved" }),
      ]);
    });

    const visibleTicketIds = () =>
      within(screen.getByRole("table"))
        .queryAllByRole("link")
        .map((link) => link.textContent);

    it.each(["SQA-0012", "0012", "12"])("TC-FR56-16: searching %j shows ticket 12 but not 112 or 120", async (term) => {
      renderStaffTickets();
      await screen.findByText("VPN not connecting");

      await userEvent.type(screen.getByPlaceholderText(/search/i), term);

      expect(visibleTicketIds()).toEqual(["SQA-0012"]);
    });

    it("TC-FR56-17: title search and status filter apply together", async () => {
      renderStaffTickets();
      await screen.findByText("VPN not connecting");

      await userEvent.type(screen.getByPlaceholderText(/search/i), "VPN");
      await userEvent.selectOptions(screen.getByRole("combobox"), "open");

      expect(visibleTicketIds()).toEqual(["SQA-0012"]);
    });

    it("TC-FR56-18: no matches shows the empty-result message", async () => {
      renderStaffTickets();
      await screen.findByText("VPN not connecting");

      await userEvent.type(screen.getByPlaceholderText(/search/i), "vpn");
      await userEvent.selectOptions(screen.getByRole("combobox"), "closed");

      expect(visibleTicketIds()).toEqual([]);
      expect(screen.getByText("No tickets match your search.")).toBeInTheDocument();
    });
  });
});
