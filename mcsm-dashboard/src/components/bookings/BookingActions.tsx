"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  bookingId: string;
  status: string;
  moves: string[];
  canReschedule: boolean;
};

const FLOW = [
  "Pending",
  "Quoted",
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
];

type Kind = "forward" | "backward" | "cancel" | "reject" | "reopen";

function kindOf(from: string, to: string): Kind {
  if (to === "Cancelled") return "cancel";
  if (to === "Rejected") return "reject";
  if (!FLOW.includes(from)) return "reopen";
  return FLOW.indexOf(to) > FLOW.indexOf(from) ? "forward" : "backward";
}

const LABEL: Record<Kind, (to: string) => string> = {
  forward: (to) => `Move to ${to}`,
  backward: (to) => `Move back to ${to}`,
  cancel: () => "Cancel booking",
  reject: () => "Reject request",
  reopen: () => "Reopen as Pending",
};

const CONFIRM: Record<Exclude<Kind, "forward">, (to: string) => string> = {
  cancel: () =>
    "Cancel this booking? This can only be undone by reopening it manually.",
  reject: () => "Reject this request? The customer's request will be closed.",
  backward: (to) =>
    `This is a manual override: the booking moves back to ${to}. Quotes, payments, and staff responses are not changed.`,
  reopen: () =>
    "Reopen this booking as Pending? Quotes, payments, and staff responses are not changed.",
};

const primary =
  "cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const outline =
  "cursor-pointer rounded-md border border-input px-4 py-2 hover:border-primary disabled:cursor-not-allowed disabled:opacity-60";
const danger =
  "cursor-pointer rounded-md border border-destructive px-4 py-2 text-destructive disabled:cursor-not-allowed disabled:opacity-60";

export default function BookingActions({
  bookingId,
  status,
  moves,
  canReschedule,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  async function send(
    key: string,
    path: string,
    body: object,
  ): Promise<boolean> {
    setBusy(key);
    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result: ApiResponse<unknown> = await res.json();
      if (!result.success) {
        (path === "status" ? setError : setRescheduleError)(
          result.error.message,
        );
        return false;
      }
      router.refresh();
      return true;
    } catch {
      (path === "status" ? setError : setRescheduleError)(
        "Could not reach the server. Please try again.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function move(to: string) {
    setError(null);
    const ok = await send(to, "status", { status: to });
    if (ok) setConfirming(null);
  }

  async function onReschedule(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setRescheduleError(null);
    const form = event.currentTarget;
    const value = String(new FormData(form).get("scheduledAt") ?? "");
    if (!value) {
      setRescheduleError("Choose a new date and time.");
      return;
    }
    const ok = await send("reschedule", "reschedule", {
      scheduledAt: new Date(value).toISOString(),
    });
    if (ok) form.reset();
  }

  const forward = moves.filter((to) => kindOf(status, to) === "forward");
  const others = moves.filter((to) => kindOf(status, to) !== "forward");
  const pending = confirming ? kindOf(status, confirming) : null;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {moves.length === 0 ? (
        <p className="text-muted-foreground">
          No status changes are available for a {status.toLowerCase()} booking.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {forward.map((to) => (
              <button
                key={to}
                type="button"
                disabled={busy !== null}
                onClick={() => move(to)}
                className={primary}
              >
                {busy === to ? "Saving..." : LABEL.forward(to)}
              </button>
            ))}
            {others.map((to) => {
              const kind = kindOf(status, to);
              return (
                <button
                  key={to}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setError(null);
                    setConfirming(to);
                  }}
                  className={
                    kind === "cancel" || kind === "reject" ? danger : outline
                  }
                >
                  {LABEL[kind](to)}
                </button>
              );
            })}
          </div>

          {confirming && pending && pending !== "forward" && (
            <div
              role="alertdialog"
              aria-label="Confirm status change"
              className="flex flex-col gap-3 rounded-md border border-border p-4"
            >
              <p className="text-sm">{CONFIRM[pending](confirming)}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => move(confirming)}
                  className={
                    pending === "cancel" || pending === "reject"
                      ? danger
                      : primary
                  }
                >
                  {busy === confirming ? "Saving..." : "Confirm"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirming(null)}
                  className={outline}
                >
                  Go back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canReschedule && (
        <form
          onSubmit={onReschedule}
          noValidate
          className="flex flex-col gap-3 border-t border-border pt-6"
        >
          <h3 className="font-medium">Reschedule</h3>
          {rescheduleError && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {rescheduleError}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="scheduledAt" className="text-sm font-medium">
                New date and time
              </label>
              <input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                className="rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="submit" disabled={busy !== null} className={primary}>
              {busy === "reschedule" ? "Saving..." : "Reschedule"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
