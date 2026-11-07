"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";

const METHODS = ["Card", "Cash", "Bank Transfer"];

export default function OpenPayment({
  bookingId,
  amount,
}: {
  bookingId: string;
  amount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const method = String(
      new FormData(event.currentTarget).get("method") ?? "",
    );
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, method }),
      });
      const body: ApiResponse<{ id: string }> = await res.json();
      if (!body.success)
        setError(body.error.details?.method?.[0] ?? body.error.message);
      else router.refresh(); // the new Pending payment appears in the table
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <p>
        <span className="text-muted-foreground">
          Amount due (accepted quote):{" "}
        </span>
        <span className="font-semibold">{centsToUSD(amount)}</span>
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="payment-method" className="text-sm font-medium">
            Payment method
          </label>
          <select
            id="payment-method"
            name="method"
            defaultValue="Card"
            className="rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Opening..." : "Open payment"}
        </button>
      </div>
    </form>
  );
}
