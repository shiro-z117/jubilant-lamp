"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ApiResponse } from "@/lib/apiResponse";

type Assignment = { staffId: string; name: string; status: string };
type Candidate = { id: string; name: string; skills: string };

type Props = {
  bookingId: string;
  bookingStatus: string;
  staffRequired: number;
  accepted: number;
  assignments: Assignment[];
  candidates: Candidate[];
  canManage: boolean;
  canChangeRequired: boolean;
  activeStaffCount: number;
};

const primary =
  "cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const outline =
  "cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60";
const danger =
  "cursor-pointer rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive disabled:cursor-not-allowed disabled:opacity-60";

async function call(
  url: string,
  method: string,
  body?: object,
): Promise<{ message: string; details?: Record<string, string[]> } | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result: ApiResponse<unknown> = await res.json();
    return result.success
      ? null
      : { message: result.error.message, details: result.error.details };
  } catch {
    return { message: "Could not reach the server. Please try again." };
  }
}

export default function StaffAssignments(props: Props) {
  const {
    bookingId,
    bookingStatus,
    staffRequired,
    accepted,
    assignments,
    candidates,
    canManage,
    canChangeRequired,
    activeStaffCount,
  } = props;
  const router = useRouter();
  const base = `/api/bookings/${encodeURIComponent(bookingId)}`;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [requiredError, setRequiredError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onAssign(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignError(null);
    const staffIds = new FormData(event.currentTarget).getAll("staffIds");
    setBusy("assign");
    const error = await call(`${base}/assign`, "POST", { staffIds });
    setBusy(null);
    if (error) {
      setAssignError(error.details?.staffIds?.[0] ?? error.message);
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function onRemove(staffId: string) {
    setRemoveError(null);
    setBusy(`remove-${staffId}`);
    const error = await call(
      `${base}/assignments/${encodeURIComponent(staffId)}`,
      "DELETE",
    );
    setBusy(null);
    if (error) {
      setRemoveError(error.message);
      return;
    }
    setRemoving(null);
    router.refresh();
  }

  async function onRequired(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequiredError(null);
    const count = String(
      new FormData(event.currentTarget).get("count") ?? "",
    ).trim();
    setBusy("required");
    const error = await call(`${base}/staff-required`, "PATCH", {
      count: count === "" ? undefined : count,
    });
    setBusy(null);
    if (error) {
      setRequiredError(error.details?.count?.[0] ?? error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p>
        <span className="text-muted-foreground">Staff required: </span>
        <span className="font-medium">{staffRequired}</span>
        <span className="text-muted-foreground"> · Accepted: </span>
        <span className="font-medium">
          {accepted} of {staffRequired}
        </span>
      </p>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">No staff are assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assignments.map((a) => (
            <li key={a.staffId} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/staff/${a.staffId}`}
                    className="text-primary hover:underline"
                  >
                    {a.name}
                  </Link>
                  <StatusBadge status={a.status} distinguishAssigned />
                </div>
                {canManage &&
                  a.status !== "Rejected" &&
                  removing !== a.staffId && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        setRemoveError(null);
                        setRemoving(a.staffId);
                      }}
                      className={danger}
                    >
                      Remove
                    </button>
                  )}
              </div>

              {removing === a.staffId && (
                <div
                  role="alertdialog"
                  aria-label={`Remove ${a.name}`}
                  className="flex flex-col gap-3 rounded-md border border-destructive p-3"
                >
                  <p className="text-sm">
                    Remove {a.name} from this booking?
                    {a.status === "Accepted" || a.status === "On the Way"
                      ? " They have already accepted, and the booking may move back to Confirmed if too few staff remain."
                      : ""}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => onRemove(a.staffId)}
                      className={danger}
                    >
                      {busy === `remove-${a.staffId}`
                        ? "Removing..."
                        : "Yes, remove"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setRemoving(null)}
                      className={outline}
                    >
                      Go back
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {removeError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {removeError}
        </p>
      )}

      {canManage ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setAssignError(null);
              setDialogOpen(true);
            }}
            className={`${primary} flex items-center gap-2`}
          >
            <Plus size={18} aria-hidden="true" />
            Assign staff
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {bookingStatus === "Pending" || bookingStatus === "Quoted"
            ? "Staff can be assigned once the booking is confirmed."
            : `Staff can no longer be changed on a ${bookingStatus.toLowerCase()} booking.`}
        </p>
      )}

      {canChangeRequired && (
        <form
          onSubmit={onRequired}
          noValidate
          className="flex flex-col gap-2 border-t border-border pt-6"
        >
          <label htmlFor="staffRequired" className="font-medium">
            Staff required
          </label>
          <p id="staffRequired-hint" className="text-sm text-muted-foreground">
            The booking automatically advances to Assigned once this many
            staff have accepted. Max {activeStaffCount} (# of active staff).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              key={staffRequired}
              id="staffRequired"
              name="count"
              type="number"
              min={1}
              max={activeStaffCount}
              defaultValue={staffRequired}
              aria-describedby={
                requiredError
                  ? "staffRequired-error staffRequired-hint"
                  : "staffRequired-hint"
              }
              aria-invalid={!!requiredError}
              className="w-24 rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="submit" disabled={busy !== null} className={primary}>
              {busy === "required" ? "Saving..." : "Save"}
            </button>
          </div>
          {requiredError && (
            <p
              id="staffRequired-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {requiredError}
            </p>
          )}
        </form>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Assign staff"
      >
        {candidates.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              Every active staff member is already assigned to this booking.
            </p>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className={`${outline} self-start`}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onAssign} noValidate className="flex flex-col gap-4">
            {assignError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {assignError}
              </p>
            )}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Choose who to assign
              </legend>
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:border-primary">
                      <input
                        type="checkbox"
                        name="staffIds"
                        value={c.id}
                        className="mt-1 accent-primary"
                      />
                      <span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {c.skills}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className={primary}
              >
                {busy === "assign" ? "Assigning..." : "Assign"}
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className={outline}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
