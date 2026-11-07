import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";
import StatusTimeline from "@/components/bookings/StatusTimeline";
import { NotFoundError } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";
import { requireRole, type Session } from "@/services/authService";
import { getBooking } from "@/services/bookingService";
import { getQuotation } from "@/services/quotationService";
import { listStaff } from "@/services/staffService";
import BookingActions from "@/components/bookings/BookingActions";
import { allowedNext } from "@/lib/bookingStatus";
import StaffAssignments from "@/components/bookings/StaffAssignments";
import { getServiceById } from "@/lib/services";
import CopyQuoteLink from "@/components/quote/CopyQuoteLink";
import QuoteForm from "@/components/quote/QuoteForm";
import { formatServicePrice } from "@/lib/services";

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

async function loadBooking(id: string, session: Session) {
  try {
    return await getBooking(id, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export default async function BookingDetailPage(
  props: PageProps<"/admin/bookings/[id]">,
) {
  const session = await requireRole("admin");
  const { id } = await props.params;
  const booking = await loadBooking(id, session);

  const quoteRows = [...booking.quotations].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const [staff, quotations] = await Promise.all([
    listStaff({ page: 1, limit: 100 }, session),
    Promise.all(quoteRows.map((q) => getQuotation(q.id, session))),
  ]);
  const hasAccepted = quotations.some((q) => q.status === "Accepted");
  const hasLive = quotations.some((q) => q.status === "Sent");
  const canQuote =
    (booking.status === "Pending" || booking.status === "Quoted") &&
    !hasAccepted &&
    !hasLive;
  const staffNames = new Map(staff.items.map((s) => [s.id, s.name]));
  const activeStaff = staff.items.filter((s) => s.isActive);
  const candidates = activeStaff
    .filter(
      (s) =>
        !booking.assignments.some(
          (a) => a.staffId === s.id && a.status !== "Rejected",
        ),
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      skills: s.skills
        .flatMap((id) => getServiceById(id)?.title ?? [])
        .join(", "),
    }));
  const canManageStaff =
    booking.status === "Confirmed" || booking.status === "Assigned";

  const accepted = booking.assignments.filter(
    (a) => a.status === "Accepted" || a.status === "On the Way",
  ).length;
  const payments = [...booking.payments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const latestPayment = payments[0];
  const moves = allowedNext(booking.status, "admin");
  const canReschedule = ["Pending", "Quoted", "Confirmed", "Assigned"].includes(
    booking.status,
  );

  return (
    <div className="flex flex-col gap-6 py-8">
      <Link
        href="/admin/bookings"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Bookings
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Booking {booking.id}</h1>
        <StatusBadge status={booking.status} />
      </div>

      <Card title="Actions">
        <BookingActions
          bookingId={booking.id}
          status={booking.status}
          moves={moves}
          canReschedule={canReschedule}
        />
      </Card>

      <Card title="Details">
        <dl className="grid gap-2 sm:grid-cols-[11rem_1fr]">
          <dt className="text-muted-foreground">Customer</dt>
          <dd>
            <Link
              href={`/admin/customers/${booking.customerId}`}
              className="text-primary hover:underline"
            >
              {booking.customer.name}
            </Link>
          </dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{booking.customer.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{booking.customer.phone}</dd>
          <dt className="text-muted-foreground">Services</dt>
          <dd>{booking.services.map((s) => s.title).join(", ")}</dd>
          <dt className="text-muted-foreground">Scheduled</dt>
          <dd>{dateTime(booking.scheduledAt)}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{booking.address}</dd>
          <dt className="text-muted-foreground">Property size</dt>
          <dd>{booking.propertySize.toLocaleString("en-US")} sq ft</dd>
          <dt className="text-muted-foreground">Pets</dt>
          <dd>{booking.pets ? "Yes" : "No"}</dd>
          <dt className="text-muted-foreground">Access notes</dt>
          <dd>{booking.accessNotes ?? "None"}</dd>
          <dt className="text-muted-foreground">Special notes</dt>
          <dd>{booking.specialNotes ?? "None"}</dd>
          <dt className="text-muted-foreground">Requested on</dt>
          <dd>{dateTime(booking.createdAt)}</dd>
        </dl>
      </Card>

      <Card title="Staff">
        <StaffAssignments
          bookingId={booking.id}
          bookingStatus={booking.status}
          staffRequired={booking.staffRequired}
          accepted={accepted}
          assignments={booking.assignments.map((a) => ({
            staffId: a.staffId,
            name: staffNames.get(a.staffId) ?? "Unknown",
            status: a.status,
          }))}
          candidates={candidates}
          canManage={canManageStaff}
          canChangeRequired={canReschedule}
          activeStaffCount={activeStaff.length}
        />
      </Card>

      <Card title="Quotations">
        {canQuote && (
          <div className="mb-6">
            <QuoteForm
              bookingId={booking.id}
              propertySize={booking.propertySize}
              revised={quotations.length > 0}
              services={booking.services.map((s) => ({
                serviceId: s.id,
                title: s.title,
                suggested:
                  s.pricingType === "fixed" && s.basePrice !== null
                    ? (s.basePrice / 100).toFixed(2)
                    : "",
                catalog: formatServicePrice(s),
              }))}
            />
          </div>
        )}
        {hasLive && (
          <p role="status" className="mb-6 text-sm text-muted-foreground">
            A quote is waiting for the customer&apos;s answer. A new one can be
            created if it expires.
          </p>
        )}
        {quotations.length === 0 ? (
          <p className="text-muted-foreground">
            No quotation has been created for this booking.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {quotations.map((q) => (
              <section
                key={q.id}
                aria-label={`Quotation created ${dateTime(q.createdAt)}`}
                className="rounded-md border border-border p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={q.status} />
                    <span className="text-sm text-muted-foreground">
                      Created {dateTime(q.createdAt)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Valid until {dateTime(q.expiresAt)}
                  </span>
                </div>

                <QuoteBreakdown breakdown={q.breakdown} />

                {q.notes && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Notes: </span>
                    {q.notes}
                  </p>
                )}
                {q.status === "Sent" && <CopyQuoteLink token={q.token} />}
                {q.status === "Accepted" && (
                  <p className="mt-3 text-sm">
                    <span className="text-muted-foreground">Payment: </span>
                    {latestPayment ? (
                      <>
                        <StatusBadge status={latestPayment.status} />{" "}
                        {centsToUSD(latestPayment.amount)}
                      </>
                    ) : (
                      "No payment has been opened yet"
                    )}
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </Card>

      <Card title="Payments">
        {payments.length === 0 ? (
          <p className="text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <caption className="sr-only">Payments for this booking</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
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
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      {centsToUSD(p.amount)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{p.method}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {dateTime(p.paidAt ?? p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Status history">
        <StatusTimeline entries={booking.statusHistory} />
      </Card>
    </div>
  );
}
