import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeProfile, makeStaffProfile } from "../../test/fixtures";
import type { Profile } from "../../types/database";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

import { AuthProvider, useAuth } from "./AuthProvider";

type ProfileResult = { data: Profile | null; error: { code: string; message: string } | null };
type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

let authCallback: AuthCallback;
let latestAuth: ReturnType<typeof useAuth>;
const profileQuery = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };

const sessionFor = (userId: string) => ({ user: { id: userId } }) as unknown as Session;
const found = (profile: Profile): ProfileResult => ({ data: profile, error: null });
const NOT_FOUND: ProfileResult = { data: null, error: { code: "PGRST116", message: "0 rows" } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function respondToProfileQueries(responder: (userId: string) => Promise<ProfileResult> | ProfileResult) {
  profileQuery.eq.mockImplementation((_column: string, userId: string) => ({
    single: () => {
      profileQuery.single(userId);
      return Promise.resolve(responder(userId));
    },
  }));
}

function AuthProbe() {
  const auth = useAuth();
  useEffect(() => {
    latestAuth = auth;
  });
  return (
    <dl>
      <dd data-testid="loading">{String(auth.isLoading)}</dd>
      <dd data-testid="user">{auth.user?.id ?? "none"}</dd>
      <dd data-testid="role">{auth.profile?.role ?? "none"}</dd>
    </dl>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

const text = (testId: string) => screen.getByTestId(testId).textContent;

async function waitForAuthState(expected: { loading: string; user: string; role: string }) {
  await waitFor(() => expect({ loading: text("loading"), user: text("user"), role: text("role") }).toEqual(expected));
}

async function emit(event: AuthChangeEvent, session: Session | null) {
  await act(async () => {
    authCallback(event, session);
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    Object.values(profileQuery).forEach((mock) => mock.mockReset());

    mocks.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    profileQuery.select.mockReturnValue({ eq: profileQuery.eq });
    mocks.from.mockReturnValue({ select: profileQuery.select });
    respondToProfileQueries(() => NOT_FOUND);
  });

  describe("initial session", () => {
    it("TC-AUTH-01: reports loading until the stored session has been checked, then a signed-out state", async () => {
      const session = deferred<{ data: { session: Session | null } }>();
      mocks.getSession.mockReturnValue(session.promise);

      renderProvider();
      expect(text("loading")).toBe("true");

      session.resolve({ data: { session: null } });

      await waitForAuthState({ loading: "false", user: "none", role: "none" });
      expect(mocks.from).not.toHaveBeenCalled();
    });

    it("TC-AUTH-02: loads the signed-in user's profile from public.users by user_id", async () => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor("user-1") } });
      respondToProfileQueries(() => found(makeProfile()));

      renderProvider();

      await waitForAuthState({ loading: "false", user: "user-1", role: "user" });
      expect(mocks.from).toHaveBeenCalledWith("users");
      expect(profileQuery.select).toHaveBeenCalledWith("*");
      expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it.each([
      ["user", makeProfile()],
      ["staff", makeStaffProfile()],
      ["admin", makeStaffProfile({ role: "admin" })],
    ])("TC-AUTH-03: exposes the %s role from the stored profile", async (role, profile) => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor(profile.user_id) } });
      respondToProfileQueries(() => found(profile));

      renderProvider();

      await waitForAuthState({ loading: "false", user: profile.user_id, role });
    });

    it("TC-AUTH-04: a signed-in user without a profile row has no role", async () => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor("user-1") } });
      respondToProfileQueries(() => NOT_FOUND);

      renderProvider();

      await waitForAuthState({ loading: "false", user: "user-1", role: "none" });
    });

    it("TC-AUTH-05: a profile request that throws finishes loading with no role instead of hanging", async () => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor("user-1") } });
      respondToProfileQueries(() => Promise.reject(new Error("network down")));

      renderProvider();

      await waitForAuthState({ loading: "false", user: "user-1", role: "none" });
    });

    it("TC-AUTH-06: a failed session lookup finishes loading as signed out instead of hanging", async () => {
      mocks.getSession.mockRejectedValue(new Error("storage unavailable"));

      renderProvider();

      await waitForAuthState({ loading: "false", user: "none", role: "none" });
    });
  });

  describe("auth state changes", () => {
    beforeEach(() => {
      mocks.getSession.mockResolvedValue({ data: { session: null } });
    });

    it("TC-AUTH-07: signing in stays loading until the new user's profile arrives", async () => {
      const staffProfile = deferred<ProfileResult>();
      respondToProfileQueries(() => staffProfile.promise);
      renderProvider();
      await waitForAuthState({ loading: "false", user: "none", role: "none" });

      await emit("SIGNED_IN", sessionFor("staff-1"));
      await waitForAuthState({ loading: "true", user: "staff-1", role: "none" });

      await act(async () => staffProfile.resolve(found(makeStaffProfile())));
      await waitForAuthState({ loading: "false", user: "staff-1", role: "staff" });
    });

    it("TC-AUTH-08: signing out clears the user and profile", async () => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor("staff-1") } });
      respondToProfileQueries(() => found(makeStaffProfile()));
      renderProvider();
      await waitForAuthState({ loading: "false", user: "staff-1", role: "staff" });

      await emit("SIGNED_OUT", null);

      await waitForAuthState({ loading: "false", user: "none", role: "none" });
    });

    it("TC-AUTH-09: a slow profile response from a previous account never overrides the current account's role", async () => {
      const staffProfile = deferred<ProfileResult>();
      const userProfile = deferred<ProfileResult>();
      respondToProfileQueries((userId) => (userId === "staff-1" ? staffProfile.promise : userProfile.promise));
      renderProvider();
      await waitForAuthState({ loading: "false", user: "none", role: "none" });

      await emit("SIGNED_IN", sessionFor("staff-1"));
      await waitFor(() => expect(profileQuery.single).toHaveBeenCalledWith("staff-1"));
      await emit("SIGNED_OUT", null);
      await emit("SIGNED_IN", sessionFor("user-1"));
      await waitFor(() => expect(profileQuery.single).toHaveBeenCalledWith("user-1"));

      await act(async () => userProfile.resolve(found(makeProfile())));
      await act(async () => staffProfile.resolve(found(makeStaffProfile())));

      await waitForAuthState({ loading: "false", user: "user-1", role: "user" });
    });

    it("TC-AUTH-10: a token refresh for the same user keeps the loaded role without refetching", async () => {
      mocks.getSession.mockResolvedValue({ data: { session: sessionFor("staff-1") } });
      respondToProfileQueries(() => found(makeStaffProfile()));
      renderProvider();
      await waitForAuthState({ loading: "false", user: "staff-1", role: "staff" });
      const profileRequests = profileQuery.single.mock.calls.length;

      await emit("TOKEN_REFRESHED", sessionFor("staff-1"));

      await waitForAuthState({ loading: "false", user: "staff-1", role: "staff" });
      expect(profileQuery.single).toHaveBeenCalledTimes(profileRequests);
    });

    it("TC-AUTH-11: the auth callback does not call Supabase synchronously (avoids the auth-lock deadlock)", async () => {
      respondToProfileQueries(() => found(makeProfile()));
      renderProvider();
      await waitForAuthState({ loading: "false", user: "none", role: "none" });

      authCallback("SIGNED_IN", sessionFor("user-1"));
      expect(mocks.from).not.toHaveBeenCalled();

      await waitForAuthState({ loading: "false", user: "user-1", role: "user" });
    });

    it("TC-AUTH-12: unsubscribes from auth changes on unmount", async () => {
      const { unmount } = renderProvider();
      await waitForAuthState({ loading: "false", user: "none", role: "none" });

      unmount();

      expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("auth actions", () => {
    beforeEach(async () => {
      mocks.getSession.mockResolvedValue({ data: { session: null } });
      renderProvider();
      await waitForAuthState({ loading: "false", user: "none", role: "none" });
    });

    it("TC-AUTH-13: signIn sends the credentials and reports success", async () => {
      mocks.signInWithPassword.mockResolvedValue({ error: null });

      await expect(latestAuth.signIn("jane@example.com", "secret")).resolves.toEqual({ error: null });
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "jane@example.com", password: "secret" });
    });

    it("TC-AUTH-14: signIn returns the Supabase error message on failure", async () => {
      mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });

      await expect(latestAuth.signIn("jane@example.com", "wrong")).resolves.toEqual({
        error: "Invalid login credentials",
      });
    });

    it("TC-AUTH-15: signUp sends the name as user metadata and returns errors", async () => {
      mocks.signUp.mockResolvedValue({ error: { message: "User already registered" } });

      await expect(latestAuth.signUp("Jane", "jane@example.com", "secret")).resolves.toEqual({
        error: "User already registered",
      });
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: "jane@example.com",
        password: "secret",
        options: { data: { name: "Jane" } },
      });
    });

    it("TC-AUTH-16: signOut delegates to Supabase", async () => {
      mocks.signOut.mockResolvedValue({ error: null });

      await latestAuth.signOut();

      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("TC-AUTH-17: useAuth outside an AuthProvider throws a clear error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AuthProbe />)).toThrow("useAuth must be used within an AuthProvider");
    vi.mocked(console.error).mockRestore();
  });
});
