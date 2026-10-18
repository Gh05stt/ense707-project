import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { makeAuthValue, makeProfile, makeStaffProfile } from "./test/fixtures";

vi.mock("./services/ticketService", () => ({
  getMyTickets: vi.fn().mockResolvedValue([]),
  getAllTickets: vi.fn().mockResolvedValue([]),
  getTicketById: vi.fn(async () => {
    const { makeTicket } = await import("./test/fixtures");
    return makeTicket({ ticket_id: 42, title: "Routed ticket" });
  }),
  getResolutionNotes: vi.fn().mockResolvedValue([]),
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

function LocationDisplay() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

const currentPath = () => screen.getByTestId("location").textContent;

function signInAs(role: "user" | "staff" | "admin" | null) {
  const profile = role === "user" ? makeProfile() : role ? makeStaffProfile({ role }) : null;
  useAppControllerMock.mockReturnValue({ isLoading: false, isAuthenticated: true, role });
  useAuthMock.mockReturnValue(makeAuthValue(profile ?? makeProfile()));
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

  it("TC-APP-01: shows only a loading screen while the auth state is unresolved", () => {
    useAppControllerMock.mockReturnValue({ isLoading: true, isAuthenticated: false, role: null });

    renderAppAt("/staff/dashboard");

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(currentPath()).toBe("/staff/dashboard");
  });

  describe("signed out", () => {
    beforeEach(() => {
      useAppControllerMock.mockReturnValue({ isLoading: false, isAuthenticated: false, role: null });
      useAuthMock.mockReturnValue(makeAuthValue(null));
    });

    it.each(["/", "/user/tickets", "/user/tickets/new", "/staff/dashboard", "/staff/tickets/42", "/unknown"])(
      "TC-APP-02: %s redirects to the login page",
      async (path) => {
        renderAppAt(path);

        expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
        expect(currentPath()).toBe("/login");
      },
    );

    it("TC-APP-03: the signup page is reachable without signing in", async () => {
      renderAppAt("/signup");

      expect(await screen.findByRole("heading", { name: "Sign up" })).toBeInTheDocument();
      expect(currentPath()).toBe("/signup");
    });
  });

  describe("signed in as a user", () => {
    beforeEach(() => signInAs("user"));

    it.each([
      ["/user/tickets", "My Tickets"],
      ["/user/tickets/new", "Create Ticket"],
    ])("TC-APP-04: %s is permitted", async (path, heading) => {
      renderAppAt(path);

      expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
      expect(currentPath()).toBe(path);
    });

    it.each(["/staff/dashboard", "/staff/tickets", "/staff/tickets/42", "/login", "/signup", "/"])(
      "TC-APP-05: %s redirects to My Tickets",
      async (path) => {
        renderAppAt(path);

        expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
        expect(currentPath()).toBe("/user/tickets");
      },
    );
  });

  describe.each(["staff", "admin"] as const)("signed in as %s", (role) => {
    beforeEach(() => signInAs(role));

    it.each([
      ["/staff/dashboard", "Overview"],
      ["/staff/tickets", "Tickets"],
      ["/staff/tickets/42", "Routed ticket"],
    ])("TC-APP-06: %s is permitted", async (path, heading) => {
      renderAppAt(path);

      expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
      expect(currentPath()).toBe(path);
    });

    it.each(["/user/tickets", "/user/tickets/new", "/login", "/"])(
      "TC-APP-07: %s redirects to the staff dashboard",
      async (path) => {
        renderAppAt(path);

        expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
        expect(currentPath()).toBe("/staff/dashboard");
      },
    );
  });

  it("TC-APP-08: a signed-in account without a role gets the least-privileged user view", async () => {
    signInAs(null);

    renderAppAt("/staff/tickets");

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(currentPath()).toBe("/user/tickets");
  });
});
