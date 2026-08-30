import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeProfile } from "../../test/fixtures";
import type { Ticket } from "../../types/database";
import CreateTicket from "./CreateTicket";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../../services/ticketService", () => ({
  createTicket: vi.fn(),
}));

vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => makeAuthValue(makeProfile()),
}));

import { createTicket } from "../../services/ticketService";

const createTicketMock = vi.mocked(createTicket);

function renderCreateTicket() {
  return render(
    <MemoryRouter>
      <CreateTicket />
    </MemoryRouter>,
  );
}

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/title/i), "Cannot log in");
  await user.selectOptions(screen.getByLabelText(/category/i), "Login Issue");
  await user.selectOptions(screen.getByLabelText(/priority/i), "high");
  await user.type(screen.getByLabelText(/description/i), "Password is rejected even though it is correct.");
  return user;
}

describe("CreateTicket page", () => {
  beforeEach(() => {
    createTicketMock.mockReset();
    navigateMock.mockReset();
  });

  it("TC-1 - FR-1: creates a ticket when all required fields are valid", async () => {
    createTicketMock.mockResolvedValue({ ticket_id: 1 } as Ticket);
    renderCreateTicket();

    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(createTicketMock).toHaveBeenCalledTimes(1);
    });

    expect(createTicketMock).toHaveBeenCalledWith("user-1", {
      title: "Cannot log in",
      category: "Login Issue",
      priority: "high",
      description: "Password is rejected even though it is correct.",
    });

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/user/tickets"));

    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("TC-2 - FR-13: prevents submission and reports a missing title", async () => {
    renderCreateTicket();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/category/i), "Login Issue");
    await user.selectOptions(screen.getByLabelText(/priority/i), "high");
    await user.type(screen.getByLabelText(/description/i), "Description without a title.");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("TC-9 - NFR-1 supporting check: form fields expose accessible labels and controls", () => {
    renderCreateTicket();

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});