import Link from "next/link";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import { getServiceById } from "@/lib/services";
import { cleanParams } from "@/lib/searchParams";
import { listBookingsSchema } from "@/schemas/booking";
import { requireRole } from "@/services/authService";
import { listBookings } from "@/services/bookingService";
import { listStaff } from "@/services/staffService";

const STATUSES = [
  "Pending",
  "Quoted",
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rejected",
];

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function BookingsPage(
  props: PageProps<"/admin/bookings">,
) {
  const session = await requireRole("admin");
  const params = cleanParams(await props.searchParams);

  // a bad filter falls back to "no filter" instead of an error page
  const parsed = listBookingsSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : listBookingsSchema.parse({});

  const [{ items, total, page, limit }, staff] = await Promise.all([
    listBookings(filters, session),
    listStaff({ page: 1, limit: 100 }, session),
  ]);
  const staffNames = new Map(staff.items.map((s) => [s.id, s.name]));

  const filtered = Boolean(
    filters.search ||
    filters.status ||
    filters.staffId ||
    filters.startDate ||
    filters.endDate,
  );

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Bookings</h1>

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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="staffId" className="text-sm font-medium">
              Staff
            </label>
            <select
              id="staffId"
              name="staffId"
              defaultValue={params.staffId ?? ""}
              className={fieldClass}
            >
              <option value="">All staff</option>
              {staff.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-sm font-medium">
              Scheduled from
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={params.startDate ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-sm font-medium">
              Scheduled to
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={params.endDate ?? ""}
              className={fieldClass}
            />
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
            {filtered ? "No bookings match these filters." : "No bookings yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left">
              <caption className="sr-only">Bookings</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Booking
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Services
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Scheduled
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Staff
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => {
                  const team = b.assignments
                    .filter((a) => a.status !== "Rejected")
                    .map((a) => staffNames.get(a.staffId) ?? "Unknown");
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-border align-top last:border-0"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {b.id}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{b.customer.name}</td>
                      <td className="py-3 pr-4">
                        {b.serviceIds
                          .flatMap((id) => getServiceById(id)?.title ?? [])
                          .join(", ")}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {dateTime(b.scheduledAt)}
                      </td>
                      <td className="py-3 pr-4">
                        {team.length > 0 ? team.join(", ") : "Unassigned"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/admin/bookings"
          params={params}
        />
      </Card>
    </div>
  );
}
