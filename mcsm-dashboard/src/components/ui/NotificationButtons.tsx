"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";

async function post(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "POST" });
    const body: ApiResponse<unknown> = await res.json();
    return body.success ? null : body.error.message;
  } catch {
    return "Could not reach the server. Please try again.";
  }
}

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const message = await post(
      `/api/notifications/${encodeURIComponent(id)}/read`,
    );
    if (message) setError(message);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Saving..." : "Mark read"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const message = await post("/api/notifications/read-all");
    if (message) setError(message);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Saving..." : "Mark all as read"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
