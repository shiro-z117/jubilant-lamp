import Link from "next/link";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import AddStaffDialog from "@/components/staff/AddStaffDialog";
import StaffActiveButton from "@/components/staff/StaffActiveButton";
import { getServiceById } from "@/lib/services";
import { cleanParams } from "@/lib/searchParams";
import { listStaffSchema } from "@/schemas/staff";
import { requireRole } from "@/services/authService";
import { listStaff } from "@/services/staffService";

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function StaffPage(props: PageProps<"/admin/staff">) {
  const session = await requireRole("admin");
  const params = cleanParams(await props.searchParams);

  // a bad filter falls back to "no filter" instead of an error page
  const parsed = listStaffSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : listStaffSchema.parse({});
  const { items, total, page, limit } = await listStaff(filters, session);

  const filtered = Boolean(
    filters.search || filters.status || filters.isActive !== undefined,
  );

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <AddStaffDialog />
      </div>

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
              placeholder="Name"
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
              {["Available", "Assigned", "Busy", "Offline"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="isActive" className="text-sm font-medium">
              Account
            </label>
            <select
              id="isActive"
              name="isActive"
              defaultValue={params.isActive ?? ""}
              className={fieldClass}
            >
              <option value="">Active and inactive</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
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
              ? "No staff match these filters."
              : "No staff yet. Use Add staff to create one."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] text-left">
              <caption className="sr-only">Staff</caption>
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
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Skills
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Account
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Rating
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Completed
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border align-top last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/staff/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{s.email}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{s.phone}</td>
                    <td className="py-3 pr-4">
                      {s.skills
                        .flatMap((id) => getServiceById(id)?.title ?? [])
                        .join(", ")}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        status={s.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {s.rating > 0
                        ? `${s.rating.toFixed(1)} / 5`
                        : "No ratings yet"}
                    </td>
                    <td className="py-3 pr-4 text-right">{s.completedJobs}</td>
                    <td className="py-3">
                      <StaffActiveButton id={s.id} isActive={s.isActive} />
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
          basePath="/admin/staff"
          params={params}
        />
      </Card>
    </div>
  );
}
