import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TicketValidationError } from "../../lib/ticketValidation";
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

  it("TC-FR13-12: submitting an empty form shows an error for every required field", async () => {
    renderCreateTicket();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Priority is required.")).toBeInTheDocument();
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("TC-FR13-13: whitespace-only title and line-break-only description are rejected", async () => {
    renderCreateTicket();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/title/i), "     ");
    await user.selectOptions(screen.getByLabelText(/category/i), "Login Issue");
    await user.selectOptions(screen.getByLabelText(/priority/i), "high");
    await user.type(screen.getByLabelText(/description/i), "  {Enter}{Enter}  {Enter}");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Title cannot be only spaces or line breaks.")).toBeInTheDocument();
    expect(screen.getByText("Description cannot be only spaces or line breaks.")).toBeInTheDocument();
    expect(screen.queryByText(/category is required|priority is required/i)).not.toBeInTheDocument();
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("TC-FR13-14: fixing the invalid field allows the ticket to be submitted", async () => {
    createTicketMock.mockResolvedValue({ ticket_id: 3 } as Ticket);
    renderCreateTicket();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/title/i), "   ");
    await user.selectOptions(screen.getByLabelText(/category/i), "Other");
    await user.selectOptions(screen.getByLabelText(/priority/i), "low");
    await user.type(screen.getByLabelText(/description/i), "Monitor flickers.");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/title cannot be only spaces/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/title/i), "Flickering monitor");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(createTicketMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/title cannot be only spaces/i)).not.toBeInTheDocument();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/user/tickets"));
  });

  it("TC-FR13-15: field errors returned by service-level validation are shown on the form", async () => {
    createTicketMock.mockRejectedValue(new TicketValidationError({ title: "Title is required." }));
    renderCreateTicket();

    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("TC-FR7-8: priority options are exactly Low, Medium, High and Critical", () => {
    renderCreateTicket();

    const options = within(screen.getByLabelText(/priority/i))
      .getAllByRole("option")
      .filter((option) => (option as HTMLOptionElement).value !== "");

    expect(options.map((option) => option.textContent)).toEqual(["Low", "Medium", "High", "Critical"]);
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual(["low", "medium", "high", "critical"]);
  });

  it("TC-FR7-9: a ticket can be submitted with Critical priority", async () => {
    createTicketMock.mockResolvedValue({ ticket_id: 2 } as Ticket);
    renderCreateTicket();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/title/i), "Server down");
    await user.selectOptions(screen.getByLabelText(/category/i), "Network Problem");
    await user.selectOptions(screen.getByLabelText(/priority/i), "critical");
    await user.type(screen.getByLabelText(/description/i), "All users affected.");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(createTicketMock).toHaveBeenCalledTimes(1));
    expect(createTicketMock.mock.calls[0][1].priority).toBe("critical");
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