"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import TextField from "@/components/ui/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { SERVICES } from "@/lib/services";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Created = { id: string; email: string; temporaryPassword: string };

export default function AddStaffDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [created, setCreated] = useState<Created | null>(null);

  function openDialog() {
    setError(null);
    setFieldErrors({});
    setCreated(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    if (created) router.refresh();
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const avatar = String(form.get("avatar") ?? "").trim();
    const experience = String(form.get("experienceYears") ?? "").trim();

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          avatar: avatar === "" ? null : avatar,
          skills: form.getAll("skills"),
          experienceYears: experience === "" ? undefined : experience, // empty should fail validation
          availability: form.getAll("availability"),
        }),
      });
      const body: ApiResponse<Created> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else {
        setCreated(body.data);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  const first = (field: string) => fieldErrors[field]?.[0];

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
      >
        <Plus size={18} aria-hidden="true" />
        Add staff
      </button>

      <Dialog
        open={open}
        onClose={handleClose}
        title={created ? "Staff account created" : "Add staff"}
      >
        {created ? (
          <div className="flex flex-col gap-4">
            <p>Share these login details with the new staff member.</p>
            <dl className="grid gap-2 rounded-md bg-muted p-4 sm:grid-cols-[7rem_1fr]">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{created.email}</dd>
              <dt className="text-muted-foreground">Password</dt>
              <dd className="font-mono">{created.temporaryPassword}</dd>
            </dl>
            <p role="status" className="text-sm font-medium text-warning">
              This password is shown only once and can&apos;t be retrieved
              later.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer self-start rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <TextField
              id="name"
              name="name"
              label="Full name"
              autoComplete="off"
              error={first("name")}
            />
            <TextField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="off"
              error={first("email")}
            />
            <TextField
              id="phone"
              name="phone"
              type="tel"
              label="Phone"
              autoComplete="off"
              error={first("phone")}
            />
            <TextField
              id="avatar"
              name="avatar"
              type="url"
              label="Photo URL (optional)"
              hint="Leave empty to show a placeholder."
              error={first("avatar")}
            />
            <TextField
              id="experienceYears"
              name="experienceYears"
              type="number"
              min={0}
              label="Years of experience"
              error={first("experienceYears")}
            />

            <fieldset
              aria-describedby={first("skills") ? "skills-error" : undefined}
            >
              <legend className="mb-1 text-sm font-medium">Skills</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="skills"
                      value={s.id}
                      className="accent-primary"
                    />
                    {s.title}
                  </label>
                ))}
              </div>
              {first("skills") && (
                <p id="skills-error" className="mt-1 text-sm text-destructive">
                  {first("skills")}
                </p>
              )}
            </fieldset>

            <fieldset
              aria-describedby={
                first("availability") ? "availability-error" : undefined
              }
            >
              <legend className="mb-1 text-sm font-medium">Availability</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {WEEKDAYS.map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="availability"
                      value={day}
                      className="accent-primary"
                    />
                    {day}
                  </label>
                ))}
              </div>
              {first("availability") && (
                <p
                  id="availability-error"
                  className="mt-1 text-sm text-destructive"
                >
                  {first("availability")}
                </p>
              )}
            </fieldset>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create staff"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-md border border-input px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
