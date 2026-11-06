import Link from "next/link";
import { Clock, MapPin, User } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { requireRole } from "@/services/authService";
import { listMyJobs } from "@/services/jobService";

const time = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default async function StaffJobsPage() {
  const session = await requireRole("staff");
  const jobs = await listMyJobs(session);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Today&apos;s jobs</h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <p className="text-muted-foreground">
            No jobs are scheduled for you today.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/staff/jobs/${job.id}`}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:border-primary">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-xl font-semibold">
                        <Clock size={20} aria-hidden="true" />
                        {time(job.scheduledAt)}
                      </p>
                      <p className="mt-1 font-medium">
                        {job.services.map((s) => s.title).join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.myStatus && <StatusBadge status={job.myStatus} />}
                      <StatusBadge status={job.status} />
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <User size={16} aria-hidden="true" />
                    {job.customerName}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={16} aria-hidden="true" />
                    {job.address}
                  </p>

                  {job.myStatus === "Assigned" && (
                    <p className="mt-3 text-sm font-medium text-warning">
                      Needs your response
                    </p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
