import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/ticketService", () => ({
  getAllTickets: vi.fn(),
}));

import { makeTicket } from "../../test/fixtures";
import { calculateDashboardKpis } from "./staffDashboard";

const NOW = new Date("2026-03-10T00:00:00.000Z").getTime();
const hoursBeforeNow = (hours: number) => new Date(NOW - hours * 60 * 60 * 1000).toISOString();

describe("calculateDashboardKpis (FR-11)", () => {
  it("TC-FR11-1: calculates all KPIs from a known sample dataset", () => {
    const tickets = [
      makeTicket({ ticket_id: 1, status: "open", created_at: hoursBeforeNow(100) }),
      makeTicket({ ticket_id: 2, status: "open", created_at: hoursBeforeNow(1) }),
      makeTicket({ ticket_id: 3, status: "in_progress", created_at: hoursBeforeNow(49) }),
      makeTicket({ ticket_id: 4, status: "in_progress", created_at: hoursBeforeNow(47) }),
      makeTicket({
        ticket_id: 5,
        status: "resolved",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T10:00:00.000Z",
      }),
      makeTicket({
        ticket_id: 6,
        status: "resolved",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-02T00:00:00.000Z",
      }),
      makeTicket({
        ticket_id: 7,
        status: "closed",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T20:00:00.000Z",
        closed_at: "2026-01-03T00:00:00.000Z",
      }),
      makeTicket({
        ticket_id: 8,
        status: "open",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T02:00:00.000Z",
      }),
    ];

    expect(calculateDashboardKpis(tickets, NOW)).toEqual({
      open: 3,
      inProgress: 2,
      resolved: 2,
      closed: 1,
      overdue: 3,
      total: 8,
      averageResolutionHours: 18,
    });
  });

  it("TC-FR11-2: returns zero counts and no average for an empty dataset", () => {
    expect(calculateDashboardKpis([], NOW)).toEqual({
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      overdue: 0,
      total: 0,
      averageResolutionHours: null,
    });
  });

  it("TC-FR11-3: a reopened ticket with a stale resolved_at does not contribute to average resolution time", () => {
    const tickets = [
      makeTicket({
        status: "in_progress",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T05:00:00.000Z",
      }),
    ];

    expect(calculateDashboardKpis(tickets, NOW).averageResolutionHours).toBeNull();
  });

  it("TC-FR11-4: resolved or closed tickets without resolved_at are excluded from the average", () => {
    const tickets = [
      makeTicket({ status: "closed", created_at: "2026-01-01T00:00:00.000Z", resolved_at: null }),
      makeTicket({
        status: "resolved",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T06:00:00.000Z",
      }),
    ];

    expect(calculateDashboardKpis(tickets, NOW).averageResolutionHours).toBe(6);
  });

  it("TC-FR11-5: average uses resolved_at, not closed_at", () => {
    const tickets = [
      makeTicket({
        status: "closed",
        created_at: "2026-01-01T00:00:00.000Z",
        resolved_at: "2026-01-01T04:00:00.000Z",
        closed_at: "2026-01-05T00:00:00.000Z",
      }),
    ];

    expect(calculateDashboardKpis(tickets, NOW).averageResolutionHours).toBe(4);
  });

  it("TC-FR11-6: overdue boundary is strictly greater than 48 hours", () => {
    const atThreshold = makeTicket({ status: "open", created_at: hoursBeforeNow(48) });
    const justOver = makeTicket({ status: "open", created_at: hoursBeforeNow(48.01) });

    expect(calculateDashboardKpis([atThreshold], NOW).overdue).toBe(0);
    expect(calculateDashboardKpis([justOver], NOW).overdue).toBe(1);
  });

  it("TC-FR11-7: resolved and closed tickets are never overdue regardless of age", () => {
    const tickets = [
      makeTicket({ status: "resolved", created_at: hoursBeforeNow(500), resolved_at: hoursBeforeNow(1) }),
      makeTicket({ status: "closed", created_at: hoursBeforeNow(500), resolved_at: hoursBeforeNow(2) }),
    ];

    expect(calculateDashboardKpis(tickets, NOW).overdue).toBe(0);
  });
});
