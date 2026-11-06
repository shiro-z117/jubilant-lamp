"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  bookingId: string;
  status: string; // the booking's status
  myStatus?: string; // this staff member's own assignment status
};

const primary =
  "cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const outline =
  "cursor-pointer rounded-md border border-input px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function JobActions({ bookingId, status, myStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const open = status === "Confirmed" || status === "Assigned";
  const accepted = myStatus === "Accepted" || myStatus === "On the Way";

  const canRespond = open && myStatus === "Assigned";
  const canTravel = open && myStatus === "Accepted";
  const canStart = status === "Assigned" && accepted;
  const canComplete = status === "In Progress" && accepted;
  const waiting = status === "Confirmed" && accepted;

  async function run(
    key: string,
    path: string,
    body?: object,
    after?: () => void,
  ) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(bookingId)}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const result: ApiResponse<unknown> = await res.json();
      if (!result.success) {
        setError(result.error.message);
        setBusy(null);
        return;
      }
      (after ?? (() => router.refresh()))();
      setBusy(null);
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(null);
    }
  }

  const noActions = !canRespond && !canTravel && !canStart && !canComplete;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {canRespond &&
        (confirmingReject ? (
          <div className="flex flex-col gap-3 rounded-md border border-destructive p-3">
            <p className="text-sm">
              Reject this job? You won&apos;t be able to open it again.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  run("reject", "respond", { accept: false }, () => {
                    router.push("/staff/jobs");
                    router.refresh();
                  })
                }
                className="cursor-pointer rounded-md bg-destructive px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "reject" ? "Rejecting..." : "Yes, reject"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setConfirmingReject(false)}
                className={outline}
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
              onClick={() => run("accept", "respond", { accept: true })}
              className={primary}
            >
              {busy === "accept" ? "Accepting..." : "Accept job"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setConfirmingReject(true)}
              className="cursor-pointer rounded-md border border-destructive px-4 py-2 text-destructive disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        ))}

      {(canTravel || canStart || canComplete) && (
        <div className="flex flex-wrap gap-3">
          {canTravel && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("travel", "on-the-way")}
              className={outline}
            >
              {busy === "travel" ? "Saving..." : "I'm on the way"}
            </button>
          )}
          {canStart && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("start", "start")}
              className={primary}
            >
              {busy === "start" ? "Starting..." : "Start job"}
            </button>
          )}
          {canComplete && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("complete", "complete")}
              className={primary}
            >
              {busy === "complete" ? "Completing..." : "Mark completed"}
            </button>
          )}
        </div>
      )}

      {waiting && (
        <p role="status" className="text-sm text-muted-foreground">
          You accepted this job. It can start once enough staff have accepted.
        </p>
      )}
      {noActions && !waiting && (
        <p role="status" className="text-sm text-muted-foreground">
          {status === "Completed"
            ? "This job is completed."
            : `No actions available while this job is ${status.toLowerCase()}.`}
        </p>
      )}
    </div>
  );
}
