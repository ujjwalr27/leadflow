"use client";

import { CircleAlert, Info } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api-client";

import { useCurrentUser, useLogin } from "../queries";
import { safeNextPath } from "../redirect";

const DEMO_CREDENTIALS = { email: "demo@leadflow.dev", password: "leadflow123" };

export function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const currentUser = useCurrentUser();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Already signed in (e.g. /login opened in a new tab): go straight to the app.
  useEffect(() => {
    if (currentUser.data) router.replace(next);
  }, [currentUser.data, next, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => router.replace(next),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) setFieldErrors(error.fieldErrors);
          else setFormError(errorMessage(error));
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Sign in">
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </p>
        )}
        <Field id="login-email" label="Email" error={fieldErrors.email}>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            placeholder="you@company.com"
            autoFocus
            invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          />
        </Field>
        <Field id="login-password" label="Password" error={fieldErrors.password}>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
          />
        </Field>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-blue-900">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
        <div>
          <p>
            Demo account: <span className="font-medium">{DEMO_CREDENTIALS.email}</span> /{" "}
            <span className="font-medium">{DEMO_CREDENTIALS.password}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_CREDENTIALS.email);
              setPassword(DEMO_CREDENTIALS.password);
              setFieldErrors({});
            }}
            className="mt-1 font-medium text-blue-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Fill in demo credentials
          </button>
        </div>
      </div>
    </div>
  );
}
