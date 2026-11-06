import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import JobActions from "@/components/staff/JobActions";
import PhotoUpload from "@/components/staff/PhotoUpload";
import { ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { requireRole, type Session } from "@/services/authService";
import { getMyJob } from "@/services/jobService";

// a booking that isn't theirs (or doesn't exist) looks the same to staff: the 404 page
async function loadJob(bookingId: string, session: Session) {
  try {
    return await getMyJob(bookingId, session);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError)
      notFound();
    throw error;
  }
}

export default async function StaffJobPage(
  props: PageProps<"/staff/jobs/[bookingId]">,
) {
  const session = await requireRole("staff");
  const { bookingId } = await props.params;
  const job = await loadJob(bookingId, session);

  const when = job.scheduledAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-6 py-8">
      <Link
        href="/staff/jobs"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to today&apos;s jobs
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Job {job.id}</h1>
        <div className="flex gap-2">
          {job.myStatus && <StatusBadge status={job.myStatus} />}
          <StatusBadge status={job.status} />
        </div>
      </div>

      <Card title="Details">
        <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">When</dt>
          <dd>{when}</dd>
          <dt className="text-muted-foreground">Services</dt>
          <dd>{job.services.map((s) => s.title).join(", ")}</dd>
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{job.customer.name}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{job.customer.phone}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{job.address}</dd>
          <dt className="text-muted-foreground">Property size</dt>
          <dd>{job.propertySize.toLocaleString("en-US")} sq ft</dd>
          <dt className="text-muted-foreground">Pets</dt>
          <dd>{job.pets ? "Yes" : "No"}</dd>
          <dt className="text-muted-foreground">Access notes</dt>
          <dd>{job.accessNotes ?? "None"}</dd>
          <dt className="text-muted-foreground">Special notes</dt>
          <dd>{job.specialNotes ?? "None"}</dd>
        </dl>
      </Card>

      <Card title="Actions">
        <JobActions
          bookingId={job.id}
          status={job.status}
          myStatus={job.myStatus}
        />
      </Card>

      <Card title="Before and after photos">
        <PhotoUpload />
      </Card>
    </div>
  );
}
