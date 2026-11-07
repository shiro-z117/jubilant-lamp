"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ApiResponse } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";

type View = "month" | "week" | "day";

type CalendarBooking = {
  id: string;
  scheduledAt: Date;
  status: string;
  address: string;
  customerName: string;
  customerPhone: string;
  services: string[];
  staff: { name: string; status: string }[];
  price: { amount: number; state: "Accepted" | "Sent" } | null;
};

type RawBooking = Omit<CalendarBooking, "scheduledAt"> & {
  scheduledAt: string;
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay()); // weeks start on Sunday
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const time = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function rangeFor(view: View, anchor: Date): { start: Date; end: Date } {
  if (view === "day")
    return { start: startOfDay(anchor), end: addDays(anchor, 1) };
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const daysInMonth = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    0,
  ).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  const start = startOfWeek(first);
  return { start, end: addDays(start, weeks * 7) };
}

function titleFor(
  view: View,
  anchor: Date,
  range: { start: Date; end: Date },
): string {
  if (view === "month")
    return anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  if (view === "day") {
    return anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const from = range.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const to = addDays(range.end, -1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${from} to ${to}`;
}

function shift(view: View, anchor: Date, direction: 1 | -1): Date {
  if (view === "month")
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  return addDays(anchor, direction * (view === "week" ? 7 : 1));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // the day view shows 6 AM to 9 PM
const MAX_PER_MONTH_CELL = 3;

function Chip({
  booking,
  compact,
  onOpen,
}: {
  booking: CalendarBooking;
  compact: boolean;
  onOpen: (b: CalendarBooking) => void;
}) {
  const closed =
    booking.status === "Cancelled" || booking.status === "Rejected";
  const label = `${time(booking.scheduledAt)}, ${booking.customerName}, ${booking.services.join(", ")}, ${booking.status}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(booking)}
      aria-label={label}
      title={label}
      className={`w-full cursor-pointer rounded-md border px-2 py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        closed
          ? "border-border bg-muted text-muted-foreground line-through"
          : "border-primary/30 bg-primary/10 hover:border-primary"
      }`}
    >
      {compact ? (
        <span className="block truncate">
          <span className="font-medium">{time(booking.scheduledAt)}</span>{" "}
          {booking.customerName}
        </span>
      ) : (
        <span className="flex flex-col gap-1">
          <span className="font-medium">
            {time(booking.scheduledAt)} {booking.customerName}
          </span>
          <span className="truncate">{booking.services.join(", ")}</span>
          <span>
            <StatusBadge status={booking.status} />
          </span>
        </span>
      )}
    </button>
  );
}

export default function CalendarView() {
  const [today] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Date>(today);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const [selected, setSelected] = useState<CalendarBooking | null>(null);
  const [result, setResult] = useState<{
    key: string;
    bookings: CalendarBooking[];
    error: string | null;
  } | null>(null);

  const range = rangeFor(view, anchor);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const key = `${startIso}|${endIso}|${attempt}`;
  const loading = result?.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = `${startIso}|${endIso}|${attempt}`;

    fetch(
      `/api/calendar?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`,
      {
        signal: controller.signal,
      },
    )
      .then((res) => res.json() as Promise<ApiResponse<RawBooking[]>>)
      .then((body) => {
        setResult(
          body.success
            ? {
                key: requestKey,
                error: null,
                bookings: body.data.map((b) => ({
                  ...b,
                  scheduledAt: new Date(b.scheduledAt),
                })),
              }
            : { key: requestKey, error: body.error.message, bookings: [] },
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return; // a newer request replaced this one
        setResult({
          key: requestKey,
          error: "Could not reach the server. Please try again.",
          bookings: [],
        });
      });

    return () => controller.abort();
  }, [startIso, endIso, attempt]);

  const bookings = result?.bookings ?? [];
  const byDay = new Map<string, CalendarBooking[]>();
  for (const b of bookings) {
    const k = dayKey(b.scheduledAt);
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }
  const on = (d: Date) => byDay.get(dayKey(d)) ?? [];

  function openDay(d: Date) {
    setAnchor(startOfDay(d));
    setView("day");
  }

  const days = Array.from(
    {
      length: Math.round(
        (range.end.getTime() - range.start.getTime()) / 86_400_000,
      ),
    },
    (_, i) => addDays(range.start, i),
  );

  const buttonClass =
    "cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Previous ${view}`}
            onClick={() => setAnchor(shift(view, anchor, -1))}
            className={buttonClass}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Next ${view}`}
            onClick={() => setAnchor(shift(view, anchor, 1))}
            className={buttonClass}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(today)}
            className={buttonClass}
          >
            Today
          </button>
        </div>

        <h2 aria-live="polite" className="text-lg font-semibold">
          {titleFor(view, anchor, range)}
        </h2>

        <div
          role="group"
          aria-label="Calendar view"
          className="flex overflow-hidden rounded-md border border-input"
        >
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`cursor-pointer px-4 py-2 text-sm capitalize ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {result?.error && !loading && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {result.error}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className={buttonClass}
          >
            Try again
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading bookings...
        </p>
      )}
      {!loading && !result?.error && bookings.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          No bookings in this period.
        </p>
      )}

      {view === "month" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[44rem] grid-cols-7 border-t border-l border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-b border-border bg-muted px-2 py-1 text-center text-sm font-medium"
              >
                {d}
              </div>
            ))}
            {days.map((d) => {
              const list = on(d);
              const isToday = dayKey(d) === dayKey(today);
              const inMonth = d.getMonth() === anchor.getMonth();
              return (
                <div
                  key={dayKey(d)}
                  className={`flex min-h-28 flex-col gap-1 border-r border-b border-border p-1 ${inMonth ? "" : "bg-muted/50"}`}
                >
                  <button
                    type="button"
                    onClick={() => openDay(d)}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`Open ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
                    className={`size-7 cursor-pointer self-start rounded-full text-sm ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "hover:bg-accent"
                          : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                  {list.slice(0, MAX_PER_MONTH_CELL).map((b) => (
                    <Chip key={b.id} booking={b} compact onOpen={setSelected} />
                  ))}
                  {list.length > MAX_PER_MONTH_CELL && (
                    <button
                      type="button"
                      onClick={() => openDay(d)}
                      className="cursor-pointer text-left text-xs text-primary hover:underline"
                    >
                      +{list.length - MAX_PER_MONTH_CELL} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[56rem] grid-cols-7 border-t border-l border-border">
            {days.map((d) => {
              const isToday = dayKey(d) === dayKey(today);
              return (
                <div
                  key={dayKey(d)}
                  className="flex min-h-64 flex-col gap-2 border-r border-b border-border p-2"
                >
                  <button
                    type="button"
                    onClick={() => openDay(d)}
                    aria-current={isToday ? "date" : undefined}
                    className={`cursor-pointer rounded-md px-2 py-1 text-left text-sm font-medium ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {d.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </button>
                  {on(d).map((b) => (
                    <Chip
                      key={b.id}
                      booking={b}
                      compact={false}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="flex flex-col">
          {on(anchor).some(
            (b) =>
              b.scheduledAt.getHours() < HOURS[0] ||
              b.scheduledAt.getHours() > HOURS[HOURS.length - 1],
          ) && (
            <div className="mb-3 flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Outside 6 AM to 9 PM</p>
              {on(anchor)
                .filter(
                  (b) =>
                    b.scheduledAt.getHours() < HOURS[0] ||
                    b.scheduledAt.getHours() > HOURS[HOURS.length - 1],
                )
                .map((b) => (
                  <Chip
                    key={b.id}
                    booking={b}
                    compact={false}
                    onOpen={setSelected}
                  />
                ))}
            </div>
          )}
          {HOURS.map((h) => (
            <div key={h} className="flex gap-3 border-t border-border py-2">
              <span className="w-16 shrink-0 text-sm text-muted-foreground">
                {new Date(2000, 0, 1, h).toLocaleTimeString("en-US", {
                  hour: "numeric",
                })}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                {on(anchor)
                  .filter((b) => b.scheduledAt.getHours() === h)
                  .map((b) => (
                    <Chip
                      key={b.id}
                      booking={b}
                      compact={false}
                      onOpen={setSelected}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Booking ${selected.id}` : "Booking"}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <dl className="grid gap-2 sm:grid-cols-[7rem_1fr]">
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                {selected.customerName} ({selected.customerPhone})
              </dd>
              <dt className="text-muted-foreground">Service</dt>
              <dd>{selected.services.join(", ")}</dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd>{selected.address}</dd>
              <dt className="text-muted-foreground">Time</dt>
              <dd>
                {selected.scheduledAt.toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </dd>
              <dt className="text-muted-foreground">Staff</dt>
              <dd>
                {selected.staff.length === 0 ? (
                  "Unassigned"
                ) : (
                  <ul className="flex flex-col gap-1">
                    {selected.staff.map((s) => (
                      <li key={s.name} className="flex items-center gap-2">
                        {s.name}
                        <StatusBadge status={s.status} distinguishAssigned />
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
              <dt className="text-muted-foreground">Price</dt>
              <dd>
                {selected.price
                  ? selected.price.state === "Accepted"
                    ? centsToUSD(selected.price.amount)
                    : `${centsToUSD(selected.price.amount)} (quote sent, awaiting the customer)`
                  : "No quote yet"}
              </dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
            </dl>
            <Link
              href={`/admin/bookings/${selected.id}`}
              className="self-start rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Open full booking
            </Link>
          </div>
        )}
      </Dialog>
    </div>
  );
}
