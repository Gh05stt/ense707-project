// Sample data for testing so results are predictable.
import type { Profile, ResolutionNote, Ticket } from "../types/database";

export interface MockAuthValue {
  session: { user: { id: string } } | null;
  user: { id: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function makeAuthValue(profile: Profile | null, overrides: Partial<MockAuthValue> = {}): MockAuthValue {
  return {
    session: profile ? { user: { id: profile.user_id } } : null,
    user: profile ? { id: profile.user_id } : null,
    profile,
    isLoading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user_id: "user-1",
    name: "Jane User",
    email: "jane@example.com",
    role: "user",
    ...overrides,
  };
}

export function makeStaffProfile(overrides: Partial<Profile> = {}): Profile {
  return makeProfile({
    user_id: "staff-1",
    name: "Sam Staff",
    email: "sam@example.com",
    role: "staff",
    ...overrides,
  });
}

let ticketCounter = 0;

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  ticketCounter += 1;
  return {
    ticket_id: ticketCounter,
    user_id: "user-1",
    title: `Sample ticket ${ticketCounter}`,
    description: "Sample description",
    category: "Software Error",
    priority: "medium",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    resolved_at: null,
    closed_at: null,
    users: { user_id: "user-1", name: "Jane User", email: "jane@example.com" },
    ...overrides,
  };
}

export function makeResolutionNote(overrides: Partial<ResolutionNote> = {}): ResolutionNote {
  return {
    note_id: 1,
    ticket_id: 1,
    staff_user_id: "staff-1",
    note_text: "Sample note",
    created_at: "2026-01-01T00:00:00.000Z",
    users: { user_id: "staff-1", name: "Sam Staff", email: "sam@example.com" },
    ...overrides,
  };
}
