import { type FormEvent, useState } from "react";

import { useAuth } from "../auth/AuthProvider";

export interface LoginController {
  email: string;
  password: string;
  error: string | null;
  isSubmitting: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useLoginController(): LoginController {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    setIsSubmitting(false);
    if (signInError) setError(signInError);
  }

  return { email, password, error, isSubmitting, setEmail, setPassword, handleSubmit };
}
