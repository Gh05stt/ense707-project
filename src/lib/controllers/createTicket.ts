import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { createTicket } from "../../services/ticketService";
import type { CreateTicketInput, TicketPriority } from "../../types/database";

export const CATEGORY_OPTIONS: string[] = [
  "Login Issue",
  "Software Error",
  "Network Problem",
  "Access Request",
  "Other",
];

export const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const EMPTY_FORM: CreateTicketInput = {
  title: "",
  category: "",
  priority: "",
  description: "",
};

export type CreateTicketFormErrors = Partial<Record<keyof CreateTicketInput, string>>;

// tickets can only be submitted if all fields are filled. If not, it raises an error for each field.
function validate(values: CreateTicketInput): CreateTicketFormErrors {
  const errors: CreateTicketFormErrors = {};
  if (!values.title.trim()) errors.title = "Title is required.";
  if (!values.category) errors.category = "Category is required.";
  if (!values.priority) errors.priority = "Priority is required.";
  if (!values.description.trim()) errors.description = "Description is required.";
  return errors;
}

export interface CreateTicketController {
  form: CreateTicketInput;
  errors: CreateTicketFormErrors;
  submitError: string | null;
  isSubmitting: boolean;
  handleTextChange: (field: keyof CreateTicketInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: "category" | "priority") => (event: ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useCreateTicketController(): CreateTicketController {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<CreateTicketInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<CreateTicketFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreateTicketInput>(field: K, value: CreateTicketInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTextChange(field: keyof CreateTicketInput) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value);
    };
  }

  function handleSelectChange(field: "category" | "priority") {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      if (field === "category") {
        updateField("category", event.target.value);
      } else {
        updateField("priority", event.target.value as TicketPriority);
      }
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!user) {
      setSubmitError("You must be logged in to submit a ticket.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket(user.id, form);
      setForm(EMPTY_FORM);
      navigate("/user/tickets");
    } catch {
      setSubmitError("Something went wrong while submitting your ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    errors,
    submitError,
    isSubmitting,
    handleTextChange,
    handleSelectChange,
    handleSubmit,
  };
}
