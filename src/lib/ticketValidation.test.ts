import { describe, expect, it } from "vitest";

import type { CreateTicketInput } from "../types/database";
import { validateCreateTicketInput } from "./ticketValidation";

const VALID: CreateTicketInput = {
  title: "Cannot log in",
  category: "Login Issue",
  priority: "high",
  description: "Password is rejected.",
};

const WHITESPACE_ONLY = [" ", "   ", "\n", "\n\n", "\t", " \r\n \t "];

describe("validateCreateTicketInput (FR-13)", () => {
  it("TC-FR13-1: accepts a fully valid ticket", () => {
    expect(validateCreateTicketInput(VALID)).toEqual({});
  });

  it("TC-FR13-2: accepts Critical priority", () => {
    expect(validateCreateTicketInput({ ...VALID, priority: "critical" })).toEqual({});
  });

  it("TC-FR13-3: reports every missing field with a field-specific message", () => {
    expect(validateCreateTicketInput({ title: "", category: "", priority: "", description: "" })).toEqual({
      title: "Title is required.",
      category: "Category is required.",
      priority: "Priority is required.",
      description: "Description is required.",
    });
  });

  it.each(WHITESPACE_ONLY)("TC-FR13-4: rejects whitespace-only title and description (%j)", (blank) => {
    expect(validateCreateTicketInput({ ...VALID, title: blank, description: blank })).toEqual({
      title: "Title cannot be only spaces or line breaks.",
      description: "Description cannot be only spaces or line breaks.",
    });
  });

  it.each(["   ", "Hardware", "login issue"])("TC-FR13-5: rejects category %j that is not one of the options", (category) => {
    expect(validateCreateTicketInput({ ...VALID, category })).toEqual({ category: "Select a valid category." });
  });

  it.each(["urgent", "CRITICAL", " high"])("TC-FR13-6: rejects priority %j that is not one of the options", (priority) => {
    const input = { ...VALID, priority } as unknown as CreateTicketInput;
    expect(validateCreateTicketInput(input)).toEqual({ priority: "Select a valid priority." });
  });

  it("TC-FR13-7: rejects non-string values supplied by callers", () => {
    const input = { title: null, category: undefined, priority: 3, description: {} } as unknown as CreateTicketInput;
    expect(Object.keys(validateCreateTicketInput(input)).sort()).toEqual(["category", "description", "priority", "title"]);
  });

  it.each([
    ["single character", "a", "b"],
    ["single character with surrounding whitespace", "  a \n", "\n b  "],
    ["very long values (no length limit in the schema)", "t".repeat(1000), "d".repeat(100_000)],
  ])("TC-FR13-8: boundary - accepts %s", (_case, title, description) => {
    expect(validateCreateTicketInput({ ...VALID, title, description })).toEqual({});
  });
});
