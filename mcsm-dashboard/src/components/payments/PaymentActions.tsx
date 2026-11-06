"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  id: string;
  status: string;
  method: string;
};

const primary =
  "cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const outline =
  "cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60";

export default function PaymentActions({ id, status, method }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, path: string, body?: object) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/payments/${encodeURIComponent(id)}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const result: ApiResponse<unknown> = await res.json();
      if (!result.success) setError(result.error.message);
      else router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(null);
  }

  const canPay = status === "Pending";
  const canFail = status === "Pending" && method !== "Cash";
  const canRefund = status === "Paid";

  if (!canPay && !canRefund)
    return <span className="text-sm text-muted-foreground">No actions</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("pay", "process", { outcome: "success" })}
            className={primary}
          >
            {busy === "pay" ? "Saving..." : "Mark as paid"}
          </button>
        )}
        {canFail && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("fail", "process", { outcome: "failure" })}
            className={outline}
          >
            {busy === "fail" ? "Saving..." : "Simulate failure"}
          </button>
        )}
        {canRefund && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("refund", "refund")}
            className={outline}
          >
            {busy === "refund" ? "Refunding..." : "Refund"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
