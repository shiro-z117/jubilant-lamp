import Link from "next/link";
import { Clock, MapPin, User } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { listMyJobs } from "@/services/jobService";

export type JobSummary = Awaited<
  ReturnType<typeof listMyJobs>
>["today"][number];

const FINISHED = ["Completed", "Cancelled", "Rejected"];

const timeOnly = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dateAndTime = (d: Date) =>
  d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function JobCard({
  job,
  showDate,
}: {
  job: JobSummary;
  showDate: boolean;
}) {
  return (
    <Link
      href={`/staff/jobs/${job.id}`}
      className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="p-4! shadow-none! transition-colors hover:border-primary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Clock size={18} aria-hidden="true" />
              {showDate
                ? dateAndTime(job.scheduledAt)
                : timeOnly(job.scheduledAt)}
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

        {job.myStatus === "Assigned" && !FINISHED.includes(job.status) && (
          <p className="mt-3 text-sm font-medium text-warning">
            Needs your response
          </p>
        )}
      </Card>
    </Link>
  );
}
