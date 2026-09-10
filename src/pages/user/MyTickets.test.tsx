import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeProfile, makeTicket } from "../../test/fixtures";
import MyTickets from "./MyTickets";

vi.mock("../../services/ticketService", () => ({
  getMyTickets: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeProfile()),
}));

import { getMyTickets } from "../../services/ticketService";

const getMyTicketsMock = vi.mocked(getMyTickets);

function renderMyTickets() {
  return render(
    <MemoryRouter>
      <MyTickets />
    </MemoryRouter>,
  );
}

const visibleTicketIds = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent)
    .filter((text): text is string => Boolean(text?.startsWith("SQA-")));

describe("MyTickets page (FR-3 / FR-5)", () => {
  beforeEach(() => {
    getMyTicketsMock.mockReset();
    getMyTicketsMock.mockResolvedValue([
      makeTicket({ ticket_id: 12, title: "VPN not connecting", status: "open" }),
      makeTicket({ ticket_id: 112, title: "Printer jam", status: "in_progress" }),
      makeTicket({ ticket_id: 120, title: "VPN drops hourly", status: "resolved" }),
    ]);
  });

  it("TC-FR56-11: loads only the signed-in user's tickets", async () => {
    renderMyTickets();

    expect(await screen.findByText("VPN not connecting")).toBeInTheDocument();
    expect(getMyTicketsMock).toHaveBeenCalledWith("user-1");
  });

  it("TC-FR56-12: searching the displayed ID SQA-0012 shows only ticket 12", async () => {
    renderMyTickets();
    await screen.findByText("VPN not connecting");

    await userEvent.type(screen.getByPlaceholderText(/search/i), "SQA-0012");

    expect(visibleTicketIds()).toEqual(["SQA-0012"]);
  });

  it("TC-FR56-13: title search and status filter apply together", async () => {
    renderMyTickets();
    await screen.findByText("VPN not connecting");

    await userEvent.type(screen.getByPlaceholderText(/search/i), "vpn");
    await userEvent.selectOptions(screen.getByRole("combobox"), "resolved");

    expect(visibleTicketIds()).toEqual(["SQA-0120"]);
  });

  it("TC-FR56-14: a search with no matches says so instead of claiming the user has no tickets", async () => {
    renderMyTickets();
    await screen.findByText("VPN not connecting");

    await userEvent.type(screen.getByPlaceholderText(/search/i), "SQA-9999");

    expect(screen.getByText("No tickets match your search.")).toBeInTheDocument();
    expect(screen.queryByText(/haven't submitted any tickets/i)).not.toBeInTheDocument();
  });

  it("TC-FR56-15: a user with no tickets sees the empty-history message", async () => {
    getMyTicketsMock.mockResolvedValue([]);
    renderMyTickets();

    expect(await screen.findByText("You haven't submitted any tickets yet.")).toBeInTheDocument();
  });
});
