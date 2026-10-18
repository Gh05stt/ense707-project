import type { Session, User } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { supabase } from "../supabaseClient";
import type { Profile } from "../../types/database";

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("users").select("*").eq("user_id", userId).single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null | undefined;
    let latestRequest = 0;

    async function applySession(newSession: Session | null) {
      if (!isMounted) return;
      setSession(newSession);

      const userId = newSession?.user.id ?? null;
      if (userId === currentUserId) return;
      currentUserId = userId;
      const request = ++latestRequest;

      setProfile(null);
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const nextProfile = await fetchProfile(userId).catch(() => null);
      // a newer session may have replaced this one while the profile was loading
      if (!isMounted || request !== latestRequest) return;
      setProfile(nextProfile);
      setIsLoading(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => {
        if (currentUserId === undefined) void applySession(null);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {

      setTimeout(() => void applySession(newSession), 0);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
