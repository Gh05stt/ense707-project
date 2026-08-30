import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeStaffProfile, makeTicket } from "../../test/fixtures";
import StaffDashboard from "./Dashboard";

vi.mock("../../services/ticketService", () => ({
  getAllTickets: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeStaffProfile()),
}));

import { getAllTickets } from "../../services/ticketService";

const getAllTicketsMock = vi.mocked(getAllTickets);

function renderDashboard() {
  return render(
    <MemoryRouter>
      <StaffDashboard />
    </MemoryRouter>,
  );
}

function findKpiValue(title: string): string {
  const label = screen.getByText(title);
  const card = label.closest("div");
  const valueEl = card?.querySelector("span:last-child");
  return valueEl?.textContent ?? "";
}

describe("StaffDashboard page", () => {
  beforeEach(() => {
    getAllTicketsMock.mockReset();
  });

  it("TC-6 - FR-11: KPI values match expected values calculated from sample ticket data", async () => {
    // Expected values were calculated by hand.
    const now = Date.now();
    const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();

    const tickets = [
      makeTicket({ ticket_id: 1, status: "open", created_at: hoursAgo(100) }),
      makeTicket({ ticket_id: 2, status: "in_progress", created_at: hoursAgo(10) }),
      makeTicket({
        ticket_id: 3,
        status: "resolved",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T10:00:00.000Z",
      }),
      makeTicket({
        ticket_id: 4,
        status: "closed",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T20:00:00.000Z",
        closed_at: "2026-01-02T00:00:00.000Z",
      }),
      makeTicket({ ticket_id: 5, status: "open", created_at: hoursAgo(1) }),
    ];
    getAllTicketsMock.mockResolvedValue(tickets);

    renderDashboard();

    expect(await screen.findByText("Total Number of Tickets")).toBeInTheDocument();

    expect(findKpiValue("Total Number of Tickets")).toBe("5");
    expect(findKpiValue("Open Tickets")).toBe("2");
    expect(findKpiValue("In Progress Tickets")).toBe("1");
    expect(findKpiValue("Overdue Tickets")).toBe("1");
    expect(findKpiValue("Avg. Time to Close (hrs)")).toBe("15");
  });

  it("TC-6 - FR-11: shows zeroed KPIs when there are no tickets", async () => {
    getAllTicketsMock.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText("Total Number of Tickets")).toBeInTheDocument();
    expect(findKpiValue("Total Number of Tickets")).toBe("0");
    expect(findKpiValue("Avg. Time to Close (hrs)")).toBe("0");
  });
});
