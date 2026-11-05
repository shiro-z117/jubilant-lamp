"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/lib/apiResponse";
import Card from "@/components/ui/Card";

type ForgotResult = { message: string };

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setEmailError(null);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const body: ApiResponse<ForgotResult> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setEmailError(body.error.details?.email?.[0] ?? null);
      } else {
        setMessage(body.data.message);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Reset your password">
      {message ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm">
            {message}
          </p>
          <Link
            href="/login"
            className="text-center text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && !emailError && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className={inputClass}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive">
                {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <Link
            href="/login"
            className="text-center text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </Card>
  );
}
