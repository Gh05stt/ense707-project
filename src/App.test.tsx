import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { makeAuthValue, makeProfile, makeStaffProfile } from "./test/fixtures";

vi.mock("./services/ticketService", () => ({
  getMyTickets: vi.fn().mockResolvedValue([]),
  getAllTickets: vi.fn().mockResolvedValue([]),
}));

vi.mock("./lib/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./lib/controllers/app", () => ({
  useAppController: vi.fn(),
}));

import { useAuth } from "./lib/auth/AuthProvider";
import { useAppController } from "./lib/controllers/app";
import type { MockAuthValue } from "./test/fixtures";

const useAppControllerMock = vi.mocked(useAppController);
const useAuthMock = vi.mocked(useAuth) as unknown as {
  mockReset: () => void;
  mockReturnValue: (value: MockAuthValue) => void;
};

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App routing / role-based access (FR-12)", () => {
  beforeEach(() => {
    useAppControllerMock.mockReset();
    useAuthMock.mockReset();
  });

  it("TC-10 - FR-12: a normal user cannot access staff-only screens", async () => {
    useAppControllerMock.mockReturnValue({ isLoading: false, isAuthenticated: true, role: "user" });
    useAuthMock.mockReturnValue(makeAuthValue(makeProfile()));

    renderAppAt("/staff/dashboard");

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.queryByText("Total Number of Tickets")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("TC-10 - FR-12: a normal user cannot render the staff tickets list route either", async () => {
    useAppControllerMock.mockReturnValue({ isLoading: false, isAuthenticated: true, role: "user" });
    useAuthMock.mockReturnValue(makeAuthValue(makeProfile()));

    renderAppAt("/staff/tickets/42");

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.queryByText(/back to all tickets/i)).not.toBeInTheDocument();
  });

  it("sanity check: staff users can access the staff dashboard route", async () => {
    useAppControllerMock.mockReturnValue({ isLoading: false, isAuthenticated: true, role: "staff" });
    useAuthMock.mockReturnValue(makeAuthValue(makeStaffProfile()));

    renderAppAt("/staff/dashboard");

    expect(await screen.findByText("Total Number of Tickets")).toBeInTheDocument();
  });
});
