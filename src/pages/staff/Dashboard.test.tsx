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

const KPI_TITLES = [
  "Open Tickets",
  "In Progress Tickets",
  "Resolved Tickets",
  "Closed Tickets",
  "Overdue Tickets (> 48 hrs)",
  "Avg. Resolution Time (hrs)",
];

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

  it("TC-6 - FR-11: displays all six required KPIs calculated from sample ticket data", async () => {
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
      makeTicket({
        ticket_id: 6,
        status: "open",
        created_at: hoursAgo(2),
        resolved_at: hoursAgo(1),
      }),
    ];
    getAllTicketsMock.mockResolvedValue(tickets);

    renderDashboard();

    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    expect(findKpiValue("Open Tickets")).toBe("3");
    expect(findKpiValue("In Progress Tickets")).toBe("1");
    expect(findKpiValue("Resolved Tickets")).toBe("1");
    expect(findKpiValue("Closed Tickets")).toBe("1");
    expect(findKpiValue("Overdue Tickets (> 48 hrs)")).toBe("1");
    expect(findKpiValue("Avg. Resolution Time (hrs)")).toBe("15");
    expect(findKpiValue("Total Number of Tickets")).toBe("6");
  });

  it("TC-6 - FR-11: shows zero counts and N/A average when there are no tickets", async () => {
    getAllTicketsMock.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    for (const title of KPI_TITLES.filter((t) => t !== "Avg. Resolution Time (hrs)")) {
      expect(findKpiValue(title)).toBe("0");
    }
    expect(findKpiValue("Avg. Resolution Time (hrs)")).toBe("N/A");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("TC-FR11-8: shows a loading message instead of zero values while tickets load", () => {
    getAllTicketsMock.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    for (const title of KPI_TITLES) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
  });

  it("TC-FR11-9: shows an error instead of zero values when tickets fail to load", async () => {
    getAllTicketsMock.mockRejectedValue(new Error("permission denied"));

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load dashboard data/i);
    expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument();
    for (const title of KPI_TITLES) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
  });
});
