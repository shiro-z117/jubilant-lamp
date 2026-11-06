import Link from "next/link";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import centsToUSD from "@/lib/centsToUSD";
import { cleanParams } from "@/lib/searchParams";
import { listCustomersSchema } from "@/schemas/customer";
import { requireRole } from "@/services/authService";
import { listCustomers } from "@/services/customerService";

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function CustomersPage(
  props: PageProps<"/admin/customers">,
) {
  const session = await requireRole("admin");
  const params = cleanParams(await props.searchParams);

  // a bad filter falls back to "no filter" instead of an error page
  const parsed = listCustomersSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : listCustomersSchema.parse({});
  const { items, total, page, limit } = await listCustomers(filters, session);

  const filtered = Boolean(filters.search || filters.activity);

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Customers</h1>

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
              placeholder="Name, email, or phone"
              defaultValue={params.search ?? ""}
              className={`${fieldClass} w-64`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="activity" className="text-sm font-medium">
              Bookings
            </label>
            <select
              id="activity"
              name="activity"
              defaultValue={params.activity ?? ""}
              className={fieldClass}
            >
              <option value="">All customers</option>
              <option value="active">With active bookings</option>
              <option value="past">No active bookings</option>
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
            {filtered
              ? "No customers match these filters."
              : "No customers yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <caption className="sr-only">Customers</caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Bookings
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Active
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Total spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{c.email}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{c.phone}</td>
                    <td className="py-3 pr-4 text-right">{c.bookingCount}</td>
                    <td className="py-3 pr-4 text-right">{c.activeBookings}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {centsToUSD(c.totalSpent)}
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
          basePath="/admin/customers"
          params={params}
        />
      </Card>
    </div>
  );
}
