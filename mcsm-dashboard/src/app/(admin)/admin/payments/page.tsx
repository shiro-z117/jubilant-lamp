import Link from "next/link";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import PaymentActions from "@/components/ui/PaymentActions";
import centsToUSD from "@/lib/centsToUSD";
import { cleanParams } from "@/lib/searchParams";
import { listPaymentsSchema } from "@/schemas/payment";
import { requireRole } from "@/services/authService";
import { listPayments } from "@/services/paymentService";

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

const date = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default async function PaymentsPage(
  props: PageProps<"/admin/payments">,
) {
  const session = await requireRole("admin");
  const params = cleanParams(await props.searchParams);

  // a bad filter falls back to "no filter" instead of an error page
  const parsed = listPaymentsSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : listPaymentsSchema.parse({});
  const { items, total, page, limit } = await listPayments(filters, session);

  const filtered = Boolean(filters.search || filters.status || filters.method);

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Payments</h1>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Booking ID or customer"
              defaultValue={params.search ?? ""}
              className={`${fieldClass} w-64`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className={fieldClass}
            >
              <option value="">All statuses</option>
              {["Pending", "Paid", "Failed", "Refunded"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="method" className="text-sm font-medium">
              Method
            </label>
            <select
              id="method"
              name="method"
              defaultValue={params.method ?? ""}
              className={fieldClass}
            >
              <option value="">All methods</option>
              {["Card", "Cash", "Bank Transfer"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Apply
          </button>
        </form>
      </Card>

      <Card>
        {items.length === 0 ? (
          <p className="text-muted-foreground">
            {filtered ? "No payments match these filters." : "No payments yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left">
              <caption className="sr-only">Payments</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Booking
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Method
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Date
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border align-top last:border-0"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Link
                        href={`/admin/bookings/${p.bookingId}`}
                        className="text-primary hover:underline"
                      >
                        {p.bookingId}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{p.customerName}</td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      {centsToUSD(p.amount)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{p.method}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {date(p.date)}
                    </td>
                    <td className="py-3">
                      <PaymentActions
                        id={p.id}
                        status={p.status}
                        method={p.method}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/admin/payments"
          params={params}
        />
      </Card>
    </div>
  );
}
