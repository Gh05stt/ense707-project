import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { createTicket } from "../../services/ticketService";
import { type CreateTicketFormErrors, TicketValidationError, validateCreateTicketInput } from "../ticketValidation";
import type { CreateTicketInput, TicketPriority } from "../../types/database";

export { CATEGORY_OPTIONS } from "../ticketValidation";
export type { CreateTicketFormErrors };

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

    // tickets can only be submitted if all fields are valid. if not each field gets an error
    const validationErrors = validateCreateTicketInput(form);
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
    } catch (error) {
      if (error instanceof TicketValidationError) {
        setErrors(error.fieldErrors);
        return;
      }
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
