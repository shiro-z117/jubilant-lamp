"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";
import TextField from "@/components/ui/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { calculateQuote } from "@/lib/calculateQuote";
import centsToUSD from "@/lib/centsToUSD";

type ServiceLine = {
  serviceId: string;
  title: string;
  suggested: string; // pre-filled price in dollars, or "" when the admin must enter one
  catalog: string; // the catalog price text, shown as a hint
};

type Props = {
  bookingId: string;
  propertySize: number;
  services: ServiceLine[];
  revised: boolean; // true when an earlier quote exists
};

const MONEY = /^\d{1,7}(\.\d{1,2})?$/;
const PERCENT = /^\d{1,3}(\.\d{1,2})?$/;

// "80.50" -> 8050 cents; null when it isn't a valid amount
function toCents(value: string): number | null {
  const v = value.trim();
  return MONEY.test(v) ? Math.round(Number(v) * 100) : null;
}

function toRate(value: string): number | null {
  const v = value.trim();
  if (!PERCENT.test(v) || Number(v) > 100) return null;
  return Number((Number(v) / 100).toFixed(6));
}

// the format a datetime-local input expects, in the browser's timezone
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// turns the API's field paths (services.0.price) into this form's error keys
function mapServerErrors(
  details: Record<string, string[]>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(details)) {
    const message = messages[0];
    const price = key.match(/^services\.(\d+)\.price$/);
    const desc = key.match(/^addOns\.(\d+)\.description$/);
    const amount = key.match(/^addOns\.(\d+)\.amount$/);
    if (price) out[`price-${price[1]}`] = message;
    else if (desc) out[`addon-desc-${desc[1]}`] = message;
    else if (amount) out[`addon-amount-${amount[1]}`] = message;
    else if (key === "taxRate") out.tax = message;
    else if (key === "expiresAt") out.expires = message;
    else out[key] = message;
  }
  return out;
}

const primary =
  "cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";
const outline =
  "cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60";

export default function QuoteForm({
  bookingId,
  propertySize,
  services,
  revised,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<string[]>(() =>
    services.map((s) => s.suggested),
  );
  const [addOns, setAddOns] = useState<
    { description: string; amount: string }[]
  >([]);
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // live preview: invalid or blank amounts count as 0 until they are fixed
  const lines = services.map((s, i) => ({
    serviceId: s.serviceId,
    title: s.title,
    price: toCents(prices[i]) ?? 0,
  }));
  const extras = addOns.map((a) => ({
    description: a.description.trim() || "Extra",
    amount: toCents(a.amount) ?? 0,
  }));
  const taxRate = toRate(taxPercent) ?? 0;
  const calc = calculateQuote({
    services: lines,
    addOns: extras,
    discount: toCents(discount) ?? 0,
    taxRate,
  });

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    prices.forEach((p, i) => {
      if (toCents(p) === null)
        e[`price-${i}`] = "Enter an amount like 80 or 80.50";
    });
    addOns.forEach((a, i) => {
      if (!a.description.trim()) e[`addon-desc-${i}`] = "Describe this line";
      if (toCents(a.amount) === null)
        e[`addon-amount-${i}`] = "Enter an amount like 20 or 20.50";
    });
    const d = toCents(discount);
    if (d === null) e.discount = "Enter an amount like 10 or 0";
    else if (d > calc.subtotal)
      e.discount = `Discount cannot exceed the subtotal (${centsToUSD(calc.subtotal)})`;
    if (toRate(taxPercent) === null) e.tax = "Enter a percentage from 0 to 100";
    if (!expiresAt) e.expires = "Choose when this quote expires";
    else if (new Date(expiresAt).getTime() <= Date.now())
      e.expires = "The expiry must be in the future";
    return e;
  }

  function expireIn(days: number) {
    const now = new Date().getTime();
    setExpiresAt(toLocalInput(new Date(now + days * 86_400_000)));
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/quotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            services: services.map((s, i) => ({
              serviceId: s.serviceId,
              price: toCents(prices[i]),
            })),
            addOns: addOns.map((a) => ({
              description: a.description.trim(),
              amount: toCents(a.amount),
            })),
            discount: toCents(discount),
            taxRate: toRate(taxPercent),
            expiresAt: new Date(expiresAt).toISOString(),
            notes: notes.trim() === "" ? null : notes.trim(),
          }),
        },
      );
      const body: ApiResponse<{ id: string; token: string }> = await res.json();

      if (!body.success) {
        setFormError(body.error.message);
        setErrors(mapServerErrors(body.error.details ?? {}));
        setLoading(false);
        return;
      }
      router.refresh(); // the new quote appears below, with its customer link
    } catch {
      setFormError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${primary} flex items-center gap-2`}
      >
        <Plus size={18} aria-hidden="true" />
        {revised ? "Create revised quote" : "Create quote"}
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-md border border-border p-4"
    >
      <h3 className="text-lg font-semibold">
        {revised ? "New quote" : "Create quote"}
      </h3>

      {formError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-medium">Services</legend>
        {services.map((s, i) => (
          <TextField
            key={s.serviceId}
            id={`price-${i}`}
            label={`${s.title} (USD)`}
            inputMode="decimal"
            value={prices[i]}
            onChange={(e) =>
              setPrices((prev) =>
                prev.map((p, j) => (j === i ? e.target.value : p)),
              )
            }
            hint={`Catalog: ${s.catalog}`}
            error={errors[`price-${i}`]}
          />
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-medium">Extra lines</legend>
        <p className="text-sm text-muted-foreground">
          Property size: {propertySize.toLocaleString("en-US")} sq ft. Add a
          size charge or any extras as lines.
        </p>
        {addOns.map((a, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3">
            <div className="min-w-48 flex-1">
              <TextField
                id={`addon-desc-${i}`}
                label="Description"
                value={a.description}
                onChange={(e) =>
                  setAddOns((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, description: e.target.value } : x,
                    ),
                  )
                }
                error={errors[`addon-desc-${i}`]}
              />
            </div>
            <div className="w-36">
              <TextField
                id={`addon-amount-${i}`}
                label="Amount (USD)"
                inputMode="decimal"
                value={a.amount}
                onChange={(e) =>
                  setAddOns((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, amount: e.target.value } : x,
                    ),
                  )
                }
                error={errors[`addon-amount-${i}`]}
              />
            </div>
            <button
              type="button"
              aria-label={`Remove extra line ${i + 1}`}
              onClick={() =>
                setAddOns((prev) => prev.filter((_, j) => j !== i))
              }
              className="mt-7 cursor-pointer rounded-md border border-input p-2 text-destructive hover:border-destructive"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setAddOns((prev) => [...prev, { description: "", amount: "" }])
          }
          className={`${outline} flex items-center gap-2 self-start`}
        >
          <Plus size={16} aria-hidden="true" />
          Add a line
        </button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="discount"
          label="Discount (USD)"
          inputMode="decimal"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          hint="Taken off the subtotal before tax."
          error={errors.discount}
        />
        <TextField
          id="tax"
          label="Tax rate (%)"
          inputMode="decimal"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
          hint="Applied after the discount."
          error={errors.tax}
        />
      </div>

      <div className="flex flex-col gap-2">
        <TextField
          id="expires"
          type="datetime-local"
          label="Quote valid until"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          error={errors.expires}
        />
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => expireIn(days)}
              className={outline}
            >
              In {days} days
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-md bg-muted p-4">
        <h4 className="mb-2 font-medium">Quote preview</h4>
        <QuoteBreakdown
          breakdown={{ services: lines, addOns: extras, taxRate, ...calc }}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className={primary}>
          {loading ? "Sending..." : "Create and send quote"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen(false)}
          className={outline}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
