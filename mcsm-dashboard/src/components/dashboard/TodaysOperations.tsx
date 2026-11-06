import StatusBadge from "@/components/ui/StatusBadge";
import type { getTodaysOperations } from "@/services/dashboardService";

type Operations = Awaited<ReturnType<typeof getTodaysOperations>>;

const time = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function TodaysOperations({
  operations,
}: {
  operations: Operations;
}) {
  if (operations.length === 0)
    return (
      <p className="text-muted-foreground">Nothing is scheduled for today.</p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left">
        <caption className="sr-only">Today&apos;s scheduled bookings</caption>
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              Time
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Customer
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Service
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
          {operations.map((op) => (
            <tr key={op.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 whitespace-nowrap">
                {time(op.scheduledAt)}
              </td>
              <td className="py-3 pr-4">{op.customerName}</td>
              <td className="py-3 pr-4">{op.services.join(", ")}</td>
              <td className="py-3 pr-4">
                {op.staff.length > 0 ? op.staff.join(", ") : "Unassigned"}
              </td>
              <td className="py-3">
                <StatusBadge status={op.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
