import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, DollarSign, History } from "lucide-react";
import Card from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { NotFoundError } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";
import { requireRole, type Session } from "@/services/authService";
import { getCustomer } from "@/services/customerService";

type CustomerDetail = Awaited<ReturnType<typeof getCustomer>>;

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const date = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

async function loadCustomer(id: string, session: Session) {
  try {
    return await getCustomer(id, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

function BookingsTable({
  title,
  bookings,
  empty,
}: {
  title: string;
  bookings: CustomerDetail["activeBookings"];
  empty: string;
}) {
  return (
    <Card title={title}>
      {bookings.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Booking
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Scheduled
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Services
                </th>
                <th scope="col" className="py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.id}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {dateTime(b.scheduledAt)}
                  </td>
                  <td className="py-3 pr-4">
                    {b.services.map((s) => s.title).join(", ")}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default async function CustomerDetailPage(
  props: PageProps<"/admin/customers/[id]">,
) {
  const session = await requireRole("admin");
  const { id } = await props.params;
  const customer = await loadCustomer(id, session);

  return (
    <div className="flex flex-col gap-6 py-8">
      <Link
        href="/admin/customers"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to customers
      </Link>

      <h1 className="text-2xl font-semibold">{customer.name}</h1>

      <Card title="Contact">
        <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{customer.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{customer.phone}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{customer.address}</dd>
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Number of bookings"
          value={customer.bookingCount}
          icon={History}
          hint="All time"
        />
        <KpiCard
          label="Active bookings"
          value={customer.activeBookings.length}
          icon={CalendarCheck}
          hint="Not yet finished"
        />
        <KpiCard
          label="Total spent"
          value={centsToUSD(customer.totalSpent)}
          icon={DollarSign}
          hint="Paid payments only"
        />
      </div>

      <BookingsTable
        title="Active bookings"
        bookings={customer.activeBookings}
        empty="No active bookings."
      />
      <BookingsTable
        title="Past bookings"
        bookings={customer.pastBookings}
        empty="No past bookings."
      />

      <Card title="Payment history">
        {customer.payments.length === 0 ? (
          <p className="text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <caption className="sr-only">Payment history</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Booking
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
                  <th scope="col" className="py-2 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Link
                        href={`/admin/bookings/${p.bookingId}`}
                        className="text-primary hover:underline"
                      >
                        {p.bookingId}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      {centsToUSD(p.amount)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{p.method}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 whitespace-nowrap">{date(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
