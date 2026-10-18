import { describe, expect, it } from "vitest";

import { makeTicket } from "../test/fixtures";
import type { TicketStatus } from "../types/database";
import { filterTickets, parseTicketIdQuery, type StatusFilter } from "./ticketFilters";

const TICKETS = [
  makeTicket({ ticket_id: 12, title: "VPN not connecting", status: "open" }),
  makeTicket({ ticket_id: 112, title: "Printer jam", status: "in_progress" }),
  makeTicket({ ticket_id: 120, title: "Laptop overheating", status: "resolved" }),
  makeTicket({ ticket_id: 1, title: "Email bounce", status: "closed" }),
  makeTicket({ ticket_id: 7, title: "vpn slow at home", status: "resolved" }),
];

const ids = (searchTerm: string, statusFilter: StatusFilter = "all") =>
  filterTickets(TICKETS, searchTerm, statusFilter).map((ticket) => ticket.ticket_id);

describe("parseTicketIdQuery", () => {
  it.each([
    ["SQA-0012", 12],
    ["sqa-0012", 12],
    ["SQA0012", 12],
    ["0012", 12],
    ["12", 12],
    [" 12 ", 12],
    ["SQA-0120", 120],
  ])("TC-FR56-1: parses %j as ticket ID %i", (term, expected) => {
    expect(parseTicketIdQuery(term)).toBe(expected);
  });

  it.each(["", "SQA-", "abc", "12a", "SQA-12-3"])("TC-FR56-2: %j is not an ID query", (term) => {
    expect(parseTicketIdQuery(term)).toBeNull();
  });
});

describe("filterTickets (FR-5 / FR-6)", () => {
  it.each(["SQA-0012", "sqa-0012", "0012", "12"])("TC-FR56-3: %j matches only ticket 12", (term) => {
    expect(ids(term)).toEqual([12]);
  });

  it.each([
    ["112", [112]],
    ["120", [120]],
    ["SQA-0120", [120]],
    ["1", [1]],
  ])("TC-FR56-4: ID search %j matches exactly, not by substring", (term, expected) => {
    expect(ids(term)).toEqual(expected);
  });

  it.each([
    ["vpn", [12, 7]],
    ["VPN", [12, 7]],
    ["NOT CONN", [12]],
    ["printer", [112]],
    ["  laptop  ", [120]],
  ])("TC-FR56-5: title search %j is partial and case-insensitive", (term, expected) => {
    expect(ids(term)).toEqual(expected);
  });

  it("TC-FR56-6: a numeric term still matches titles that contain it", () => {
    const tickets = [...TICKETS, makeTicket({ ticket_id: 300, title: "Room 12 projector" })];
    expect(filterTickets(tickets, "12", "all").map((ticket) => ticket.ticket_id)).toEqual([12, 300]);
  });

  it.each<[TicketStatus, number[]]>([
    ["open", [12]],
    ["in_progress", [112]],
    ["resolved", [120, 7]],
    ["closed", [1]],
  ])("TC-FR56-7: status filter %j returns only matching tickets", (status, expected) => {
    expect(ids("", status)).toEqual(expected);
  });

  it.each<[string, StatusFilter, number[]]>([
    ["vpn", "resolved", [7]],
    ["vpn", "open", [12]],
    ["SQA-0112", "in_progress", [112]],
    ["12", "in_progress", []],
    ["vpn", "closed", []],
  ])("TC-FR56-8: search %j combined with status %j", (term, status, expected) => {
    expect(ids(term, status)).toEqual(expected);
  });

  it.each(["SQA-9999", "zzz", "SQA-"])("TC-FR56-9: %j returns no tickets", (term) => {
    expect(ids(term)).toEqual([]);
  });

  it.each(["", "   "])("TC-FR56-10: blank search %j with All Statuses returns every ticket", (term) => {
    expect(ids(term)).toEqual([12, 112, 120, 1, 7]);
  });
});
