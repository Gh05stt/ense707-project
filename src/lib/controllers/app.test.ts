import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeAuthValue, makeProfile, makeStaffProfile } from "../../test/fixtures";
import { useAppController } from "./app";

vi.mock("../auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../auth/AuthProvider";

const useAuthMock = vi.mocked(useAuth);

function controllerWith(auth: ReturnType<typeof makeAuthValue>) {
  useAuthMock.mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
  return renderHook(() => useAppController()).result.current;
}

describe("useAppController", () => {
  it("TC-APP-09: a session without a loaded profile is authenticated with no role", () => {
    const auth = makeAuthValue(makeProfile(), { profile: null });

    expect(controllerWith(auth)).toEqual({ isLoading: false, isAuthenticated: true, role: null });
  });

  it("TC-APP-10: no session means unauthenticated, even if a stale profile is present", () => {
    const auth = makeAuthValue(makeStaffProfile(), { session: null });

    expect(controllerWith(auth)).toMatchObject({ isAuthenticated: false });
  });

  it.each(["user", "staff", "admin"] as const)("TC-APP-11: passes through the %s role", (role) => {
    expect(controllerWith(makeAuthValue(makeProfile({ role })))).toMatchObject({ isAuthenticated: true, role });
  });

  it("TC-APP-12: passes through the loading state", () => {
    expect(controllerWith(makeAuthValue(null, { isLoading: true }))).toMatchObject({ isLoading: true });
  });
});
