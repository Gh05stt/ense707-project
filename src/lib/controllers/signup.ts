import { type FormEvent, useState } from "react";

import { useAuth } from "../auth/AuthProvider";

export interface SignupController {
  name: string;
  email: string;
  password: string;
  error: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useSignupController(): SignupController {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const { error: signUpError } = await signUp(name, email, password);

    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }

    setSuccessMessage("Account created successfully.");
    setName("");
    setEmail("");
    setPassword("");
  }

  return {
    name,
    email,
    password,
    error,
    successMessage,
    isSubmitting,
    setName,
    setEmail,
    setPassword,
    handleSubmit,
  };
}
