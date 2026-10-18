import type { CreateTicketInput, TicketPriority } from "../types/database";

export const CATEGORY_OPTIONS: string[] = [
  "Login Issue",
  "Software Error",
  "Network Problem",
  "Access Request",
  "Other",
];

export const TICKET_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];

export type CreateTicketFormErrors = Partial<Record<keyof CreateTicketInput, string>>;

export class TicketValidationError extends Error {
  readonly fieldErrors: CreateTicketFormErrors;

  constructor(fieldErrors: CreateTicketFormErrors) {
    super(Object.values(fieldErrors).join(" "));
    this.name = "TicketValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function validateText(value: unknown, label: string): string | undefined {
  if (typeof value !== "string" || value === "") return `${label} is required.`;
  if (value.trim() === "") return `${label} cannot be only spaces or line breaks.`;
  return undefined;
}

function validateChoice(value: unknown, options: readonly string[], label: string): string | undefined {
  if (typeof value !== "string" || value === "") return `${label} is required.`;
  if (!options.includes(value)) return `Select a valid ${label.toLowerCase()}.`;
  return undefined;
}

export function validateCreateTicketInput(input: CreateTicketInput): CreateTicketFormErrors {
  const errors: CreateTicketFormErrors = {
    title: validateText(input.title, "Title"),
    category: validateChoice(input.category, CATEGORY_OPTIONS, "Category"),
    priority: validateChoice(input.priority, TICKET_PRIORITIES, "Priority"),
    description: validateText(input.description, "Description"),
  };

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as CreateTicketFormErrors;
}
