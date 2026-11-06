"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/components/ui/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { SERVICES } from "@/lib/services";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  staff: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
    skillIds: readonly string[]; // service ids
    experienceYears: number;
    availability: readonly string[];
  };
};

export default function StaffEditForm({ staff }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const avatar = String(form.get("avatar") ?? "").trim();
    const experience = String(form.get("experienceYears") ?? "").trim();

    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staff.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          avatar: avatar === "" ? null : avatar,
          skills: form.getAll("skills"),
          experienceYears: experience === "" ? undefined : experience,
          availability: form.getAll("availability"),
        }),
      });
      const body: ApiResponse<unknown> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  const first = (field: string) => fieldErrors[field]?.[0];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          Profile saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="name"
          name="name"
          label="Full name"
          defaultValue={staff.name}
          error={first("name")}
        />
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email (also their login)"
          defaultValue={staff.email}
          error={first("email")}
        />
        <TextField
          id="phone"
          name="phone"
          type="tel"
          label="Phone"
          defaultValue={staff.phone}
          error={first("phone")}
        />
        <TextField
          id="experienceYears"
          name="experienceYears"
          type="number"
          min={0}
          label="Years of experience"
          defaultValue={staff.experienceYears}
          error={first("experienceYears")}
        />
      </div>

      <TextField
        id="avatar"
        name="avatar"
        type="url"
        label="Photo URL (optional)"
        hint="Leave empty to show a placeholder."
        defaultValue={staff.avatar ?? ""}
        error={first("avatar")}
      />

      <fieldset aria-describedby={first("skills") ? "skills-error" : undefined}>
        <legend className="mb-1 text-sm font-medium">Skills</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {SERVICES.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="skills"
                value={s.id}
                defaultChecked={staff.skillIds.includes(s.id)}
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
                defaultChecked={staff.availability.includes(day)}
                className="accent-primary"
              />
              {day}
            </label>
          ))}
        </div>
        {first("availability") && (
          <p id="availability-error" className="mt-1 text-sm text-destructive">
            {first("availability")}
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer self-start rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
