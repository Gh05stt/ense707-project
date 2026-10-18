import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { envFilesDefiningOptIn, OPT_IN_PHRASE } from "./optIn.ts";

const OPT_IN_ENV_FILES = envFilesDefiningOptIn(process.cwd());
const OPTED_IN =
  OPT_IN_ENV_FILES.length === 0 &&
  process.env.LIVE_INTEGRATION_OPTED_IN === "yes" &&
  process.env.LIVE_INTEGRATION_CONFIRM === OPT_IN_PHRASE;
const RUN_ID = `INTEGTEST-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
const RESULTS_DIR = join(process.cwd(), "integration", "results");
const OLD_TIMESTAMP = "2000-01-01T00:00:00.000Z";
const CLOCK_TOLERANCE_MS = 10 * 60 * 1000;

type Status = "PASS" | "FAIL" | "UNVERIFIED";

interface CheckResult {
  id: string;
  title: string;
  status: Status;
  errorCodes: string[];
  detail: string;
}

interface Evidence {
  codes: string[];
  notes: string[];
}

interface TicketRow {
  ticket_id: number;
  user_id: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

interface Actor {
  label: string;
  client: SupabaseClient;
  userId: string;
}

interface Config {
  url: string;
  key: string;
  accounts: Record<"userA" | "userB" | "staff", { email: string; password: string }>;
}

const results: CheckResult[] = [];
const createdTicketIds: number[] = [];
const actors: Actor[] = [];
let userA: Actor;
let userB: Actor;
let staff: Actor;
let ticketA: TicketRow;
let ticketB: TicketRow;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("REPLACE_WITH")) {
    throw new Error(`${name} is not set in .env or .env.integration.local. No live request was made.`);
  }
  return value;
}

function assertPublishableKey(key: string) {
  if (key.startsWith("sb_publishable_")) return;
  let role: unknown;
  try {
    role = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")).role;
  } catch {
    role = undefined;
  }
  if (role !== "anon") {
    throw new Error("Refusing to run: the key is not a publishable or anon key. Never use a service-role or secret key.");
  }
}

function loadConfig(): Config {
  const url = requireEnv("VITE_SUPABASE_URL");
  const key = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  const expectedRef = requireEnv("INTEGTEST_EXPECTED_PROJECT_REF");
  const account = (prefix: string) => ({
    email: requireEnv(`${prefix}_EMAIL`),
    password: requireEnv(`${prefix}_PASSWORD`),
  });
  const accounts = {
    userA: account("INTEGTEST_USER_A"),
    userB: account("INTEGTEST_USER_B"),
    staff: account("INTEGTEST_STAFF"),
  };

  assertPublishableKey(key);
  if (new URL(url).hostname !== `${expectedRef}.supabase.co`) {
    throw new Error("Refusing to run: VITE_SUPABASE_URL does not match INTEGTEST_EXPECTED_PROJECT_REF.");
  }
  return { url, key, accounts };
}

async function signIn(config: Config, label: string, account: keyof Config["accounts"]): Promise<Actor> {
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword(config.accounts[account]);
  if (error || !data.user) throw new Error(`${label}: sign-in failed (${error?.code ?? error?.status ?? "no user"})`);
  const actor = { label, client, userId: data.user.id };
  actors.push(actor);
  return actor;
}

async function ownRole(actor: Actor): Promise<string> {
  const { data, error } = await actor.client.from("users").select("role").eq("user_id", actor.userId).single();
  if (error) throw new Error(`${actor.label}: could not read own profile (${error.code})`);
  return data.role as string;
}

const marker = (suffix: string) => `${RUN_ID} ${suffix}`;
const nearNow = (iso: string | null) => iso !== null && Math.abs(Date.parse(iso) - Date.now()) < CLOCK_TOLERANCE_MS;

function noted(ev: Evidence, error: PostgrestError | null): PostgrestError | null {
  ev.codes.push(error?.code ?? "no error");
  return error;
}

async function createTicket(actor: Actor, fields: Record<string, unknown> = {}) {
  const result = await actor.client
    .from("tickets")
    .insert({
      user_id: actor.userId,
      title: marker("ticket"),
      description: marker("integration test ticket"),
      category: "Other",
      priority: "medium",
      ...fields,
    })
    .select("*")
    .single();
  if (result.data) createdTicketIds.push((result.data as TicketRow).ticket_id);
  return result as { data: TicketRow | null; error: PostgrestError | null };
}

async function readTicket(actor: Actor, ticketId: number): Promise<TicketRow | null> {
  const { data, error } = await actor.client.from("tickets").select("*").eq("ticket_id", ticketId).maybeSingle();
  if (error) throw new Error(`${actor.label}: read of ticket ${ticketId} failed (${error.code})`);
  return data as TicketRow | null;
}

function updateTicket(actor: Actor, ticketId: number, changes: Record<string, unknown>) {
  return actor.client.from("tickets").update(changes).eq("ticket_id", ticketId).select("ticket_id");
}

function check(id: string, title: string, run: (ev: Evidence) => Promise<void>) {
  it(`${id}: ${title}`, async () => {
    const ev: Evidence = { codes: [], notes: [] };
    try {
      await run(ev);
      results.push({ id, title, status: "PASS", errorCodes: ev.codes, detail: ev.notes.join("; ") });
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      results.push({ id, title, status: "FAIL", errorCodes: ev.codes, detail: [...ev.notes, message].join("; ") });
      throw error;
    }
  });
}

function unverified(id: string, title: string) {
  if (OPTED_IN) results.push({ id, title, status: "UNVERIFIED", errorCodes: [], detail: "No admin account provided" });
  it.skip(`${id}: ${title} (UNVERIFIED: no admin account provided)`, () => {});
}

function writeReport() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const report = {
    runId: RUN_ID,
    finishedAt: new Date().toISOString(),
    target: "live Supabase, publishable key, real sessions for user A, user B and staff",
    createdTicketIds,
    summary: Object.fromEntries(
      (["PASS", "FAIL", "UNVERIFIED"] as const).map((status) => [status, results.filter((r) => r.status === status).length]),
    ),
    results,
  };
  writeFileSync(join(RESULTS_DIR, `${RUN_ID}.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.table(results.map(({ id, status, errorCodes }) => ({ id, status, errorCodes: errorCodes.join(", ") })));
  console.info(
    `Run ${RUN_ID}: created tickets ${createdTicketIds.join(", ") || "none"}. ` +
      `Report: integration/results/${RUN_ID}.json. Cleanup: integration/cleanup-integtest.sql (approval required).`,
  );
}

if (OPT_IN_ENV_FILES.length > 0) {
  console.warn(`Live integration suite skipped: remove LIVE_INTEGRATION_* from ${OPT_IN_ENV_FILES.join(", ")}.`);
} else if (!OPTED_IN) {
  console.info("Live integration suite skipped. See vitest.integration.config.ts for the opt-in phrase.");
}

describe.skipIf(!OPTED_IN)(`ENSE707 live security integration (${RUN_ID})`, () => {
  beforeAll(async () => {
    const config = loadConfig();
    userA = await signIn(config, "user A", "userA");
    userB = await signIn(config, "user B", "userB");
    staff = await signIn(config, "staff", "staff");

    if (new Set([userA.userId, userB.userId, staff.userId]).size !== 3) {
      throw new Error("The three accounts must be different. No data was changed.");
    }
    const roles = [await ownRole(userA), await ownRole(userB), await ownRole(staff)];
    if (roles.join(",") !== "user,user,staff") {
      throw new Error(`Account roles are ${roles.join(", ")}; expected user, user, staff. No data was changed.`);
    }
  });

  afterAll(async () => {
    writeReport();
    await Promise.all(actors.map((actor) => actor.client.auth.signOut({ scope: "local" })));
  });

  check("IT-01", "user A creates a ticket stored as open, owned by A, with server timestamps", async (ev) => {
    const { data, error } = await createTicket(userA, { title: marker("A1"), priority: "medium" });
    expect(noted(ev, error)).toBeNull();
    ticketA = data as TicketRow;
    ev.notes.push(`ticket_id=${ticketA.ticket_id}`);
    expect(ticketA).toMatchObject({ user_id: userA.userId, status: "open", resolved_at: null, closed_at: null });
    expect(nearNow(ticketA.created_at)).toBe(true);
  });

  check("IT-02", "user A reads their own ticket by ID", async () => {
    expect((await readTicket(userA, ticketA.ticket_id))?.ticket_id).toBe(ticketA.ticket_id);
  });

  check("IT-03", "user B cannot read user A's ticket by ID", async (ev) => {
    const row = await readTicket(userB, ticketA.ticket_id);
    ev.notes.push(`rows returned=${row ? 1 : 0}`);
    expect(row).toBeNull();
  });

  check("IT-04", "user A cannot read user B's ticket by ID or in their ticket list", async (ev) => {
    const { data, error } = await createTicket(userB, { title: marker("B1") });
    expect(noted(ev, error)).toBeNull();
    ticketB = data as TicketRow;
    ev.notes.push(`ticket_id=${ticketB.ticket_id}`);

    expect(await readTicket(userA, ticketB.ticket_id)).toBeNull();
    const list = await userA.client.from("tickets").select("ticket_id, user_id");
    expect(noted(ev, list.error)).toBeNull();
    expect((list.data ?? []).every((row) => row.user_id === userA.userId)).toBe(true);
  });

  check("IT-05", "staff read both users' tickets", async () => {
    expect((await readTicket(staff, ticketA.ticket_id))?.user_id).toBe(userA.userId);
    expect((await readTicket(staff, ticketB.ticket_id))?.user_id).toBe(userB.userId);
  });

  check("IT-06", "user A cannot update the status of their own ticket", async (ev) => {
    const { data, error } = await updateTicket(userA, ticketA.ticket_id, { status: "resolved" });
    noted(ev, error);
    ev.notes.push(`rows updated=${data?.length ?? 0}`);
    expect(data ?? []).toHaveLength(0);
    expect((await readTicket(staff, ticketA.ticket_id))?.status).toBe("open");
  });

  check("IT-07", "user A cannot update the priority of their own ticket", async (ev) => {
    const { data, error } = await updateTicket(userA, ticketA.ticket_id, { priority: "critical" });
    noted(ev, error);
    ev.notes.push(`rows updated=${data?.length ?? 0}`);
    expect(data ?? []).toHaveLength(0);
    expect((await readTicket(staff, ticketA.ticket_id))?.priority).toBe("medium");
  });

  check("IT-08", "user A cannot insert resolution notes, including by spoofing the staff ID", async (ev) => {
    const own = await userA.client
      .from("resolution_notes")
      .insert({ ticket_id: ticketA.ticket_id, staff_user_id: userA.userId, note_text: marker("user note") });
    expect(noted(ev, own.error)?.code).toBe("42501");

    const spoofed = await userA.client
      .from("resolution_notes")
      .insert({ ticket_id: ticketA.ticket_id, staff_user_id: staff.userId, note_text: marker("spoofed note") });
    expect(noted(ev, spoofed.error)?.code).toBe("42501");
  });

  check("IT-09", "normal users cannot change their own role", async (ev) => {
    for (const [actor, role] of [[userA, "staff"], [userB, "admin"]] as const) {
      const { data, error } = await actor.client.from("users").update({ role }).eq("user_id", actor.userId).select("user_id");
      noted(ev, error);
      ev.notes.push(`${actor.label} rows updated=${data?.length ?? 0}`);
      expect(data ?? []).toHaveLength(0);
      expect(await ownRole(actor)).toBe("user");
    }
  });

  check("IT-10", "user A cannot delete their own ticket", async (ev) => {
    const { data, error } = await userA.client.from("tickets").delete().eq("ticket_id", ticketA.ticket_id).select("ticket_id");
    noted(ev, error);
    ev.notes.push(`rows deleted=${data?.length ?? 0}`);
    expect(data ?? []).toHaveLength(0);
    expect(await readTicket(staff, ticketA.ticket_id)).not.toBeNull();
  });

  check("IT-11", "staff update ticket status and priority", async (ev) => {
    const status = await updateTicket(staff, ticketA.ticket_id, { status: "in_progress" });
    expect(noted(ev, status.error)).toBeNull();
    expect(status.data).toHaveLength(1);
    const priority = await updateTicket(staff, ticketA.ticket_id, { priority: "high" });
    expect(noted(ev, priority.error)).toBeNull();
    expect(priority.data).toHaveLength(1);
    expect(await readTicket(staff, ticketA.ticket_id)).toMatchObject({ status: "in_progress", priority: "high" });
  });

  check("IT-12", "an In Progress ticket cannot be closed directly", async (ev) => {
    const { error } = await updateTicket(staff, ticketA.ticket_id, { status: "closed" });
    expect(noted(ev, error)?.code).toBe("23514");
    expect(await readTicket(staff, ticketA.ticket_id)).toMatchObject({ status: "in_progress", closed_at: null });
  });

  check("IT-13", "an Open ticket cannot be closed directly", async (ev) => {
    const { error } = await updateTicket(staff, ticketB.ticket_id, { status: "closed" });
    expect(noted(ev, error)?.code).toBe("23514");
    expect(await readTicket(staff, ticketB.ticket_id)).toMatchObject({ status: "open", closed_at: null });
  });

  check("IT-14", "created_at cannot be changed after creation (TC-LIFE-13)", async (ev) => {
    const { data, error } = await updateTicket(staff, ticketA.ticket_id, { created_at: OLD_TIMESTAMP });
    noted(ev, error);
    ev.notes.push(`rows updated=${data?.length ?? 0}`);
    const after = await readTicket(staff, ticketA.ticket_id);
    ev.notes.push(`created_at after=${after?.created_at}`);
    expect(Date.parse(after?.created_at ?? "")).toBe(Date.parse(ticketA.created_at));
  });

  check("IT-15", "resolved_at and closed_at cannot be set without a status change", async (ev) => {
    const { error } = await updateTicket(staff, ticketB.ticket_id, { resolved_at: OLD_TIMESTAMP, closed_at: OLD_TIMESTAMP });
    noted(ev, error);
    expect(await readTicket(staff, ticketB.ticket_id)).toMatchObject({ resolved_at: null, closed_at: null });
  });

  let resolvedAt: string | null = null;

  check("IT-16", "resolving sets resolved_at to server time even if the client sends another value", async (ev) => {
    const { data, error } = await updateTicket(staff, ticketA.ticket_id, { status: "resolved", resolved_at: OLD_TIMESTAMP });
    expect(noted(ev, error)).toBeNull();
    expect(data).toHaveLength(1);
    const after = await readTicket(staff, ticketA.ticket_id);
    resolvedAt = after?.resolved_at ?? null;
    expect(after?.status).toBe("resolved");
    expect(nearNow(resolvedAt)).toBe(true);
    expect(after?.closed_at).toBeNull();
  });

  check("IT-17", "a Resolved ticket can be closed, setting closed_at and keeping resolved_at", async (ev) => {
    const { data, error } = await updateTicket(staff, ticketA.ticket_id, { status: "closed" });
    expect(noted(ev, error)).toBeNull();
    expect(data).toHaveLength(1);
    const after = await readTicket(staff, ticketA.ticket_id);
    expect(after?.status).toBe("closed");
    expect(nearNow(after?.closed_at ?? null)).toBe(true);
    expect(after?.resolved_at).toBe(resolvedAt);
  });

  check("IT-18", "the retired urgent priority is rejected", async (ev) => {
    const { error } = await createTicket(userA, { title: marker("urgent probe"), priority: "urgent" });
    expect(noted(ev, error)?.code).toBe("23514");
  });

  check("IT-19", "critical priority is accepted", async (ev) => {
    const { data, error } = await createTicket(userA, { title: marker("critical probe"), priority: "critical" });
    expect(noted(ev, error)).toBeNull();
    expect(data?.priority).toBe("critical");
  });

  check("IT-20", "blank or whitespace-only title, description and category are rejected", async (ev) => {
    const blankTitle = await createTicket(userA, { title: "   ", description: marker("blank-title probe") });
    expect(noted(ev, blankTitle.error)?.code).toBe("23514");
    const blankDescription = await createTicket(userA, { title: marker("blank-description probe"), description: "\n \n\t" });
    expect(noted(ev, blankDescription.error)?.code).toBe("23514");
    const blankCategory = await createTicket(userA, { title: marker("blank-category probe"), category: "  " });
    expect(noted(ev, blankCategory.error)?.code).toBe("23514");
  });

  check("IT-21", "a ticket cannot be inserted as closed", async (ev) => {
    const { error } = await createTicket(userA, { title: marker("closed probe"), status: "closed" });
    expect(noted(ev, error)?.code).toBe("23514");
  });

  check("IT-22", "a ticket cannot be inserted for another user", async (ev) => {
    const { error } = await createTicket(userA, { title: marker("impersonation probe"), user_id: userB.userId });
    expect(noted(ev, error)?.code).toBe("42501");
  });

  check("IT-23", "client-supplied creation and lifecycle timestamps are replaced on insert", async (ev) => {
    const { data, error } = await createTicket(userA, {
      title: marker("timestamp probe"),
      created_at: OLD_TIMESTAMP,
      updated_at: OLD_TIMESTAMP,
      resolved_at: OLD_TIMESTAMP,
      closed_at: OLD_TIMESTAMP,
    });
    expect(noted(ev, error)).toBeNull();
    expect(nearNow(data?.created_at ?? null)).toBe(true);
    expect(data).toMatchObject({ resolved_at: null, closed_at: null });
  });

  check("IT-24", "staff create a note; the ticket owner can read it and another user cannot", async (ev) => {
    const note = await staff.client
      .from("resolution_notes")
      .insert({ ticket_id: ticketA.ticket_id, staff_user_id: staff.userId, note_text: marker("staff note") });
    expect(noted(ev, note.error)).toBeNull();

    const ownerView = await userA.client.from("resolution_notes").select("note_text").eq("ticket_id", ticketA.ticket_id);
    expect(noted(ev, ownerView.error)).toBeNull();
    expect((ownerView.data ?? []).map((row) => row.note_text)).toContain(marker("staff note"));

    const otherView = await userB.client.from("resolution_notes").select("note_id").eq("ticket_id", ticketA.ticket_id);
    expect(noted(ev, otherView.error)).toBeNull();
    expect(otherView.data ?? []).toHaveLength(0);
  });

  unverified("ADM-01", "admin reads all tickets");
  unverified("ADM-02", "admin updates ticket status and priority");
  unverified("ADM-03", "admin creates resolution notes in their own name");
});
