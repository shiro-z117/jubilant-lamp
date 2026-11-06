"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";

type Action = "accept" | "reject";

export default function QuoteActions({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(action: Action) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/quotes/${encodeURIComponent(token)}/${action}`,
        { method: "POST" },
      );
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) {
        setError(body.error.message);
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {confirmingDecline ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive p-3">
          <p className="text-sm">
            Declining cancels this booking. Are you sure?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => answer("reject")}
              className="cursor-pointer rounded-md bg-destructive px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "reject" ? "Declining..." : "Yes, decline"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setConfirmingDecline(false)}
              className="cursor-pointer rounded-md border border-input px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Go back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => answer("accept")}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "accept" ? "Accepting..." : "Accept"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setConfirmingDecline(true)}
            className="cursor-pointer rounded-md border border-destructive px-4 py-2 text-destructive disabled:cursor-not-allowed disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
