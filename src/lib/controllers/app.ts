import { useAuth } from "../auth/AuthProvider";
import type { UserRole } from "../../types/database";

export interface AppController {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}

export function useAppController(): AppController {
  const { session, profile, isLoading } = useAuth();

  return {
    isLoading,
    isAuthenticated: Boolean(session),
    role: profile?.role ?? null,
  };
}
