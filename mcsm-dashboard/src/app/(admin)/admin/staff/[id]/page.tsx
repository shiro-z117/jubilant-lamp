import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import StaffActiveButton from "@/components/staff/StaffActiveButton";
import StaffEditForm from "@/components/staff/StaffEditForm";
import { NotFoundError } from "@/lib/apiResponse";
import { requireRole, type Session } from "@/services/authService";
import { getStaff } from "@/services/staffService";

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

async function loadStaff(id: string, session: Session) {
  try {
    return await getStaff(id, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export default async function StaffDetailPage(
  props: PageProps<"/admin/staff/[id]">,
) {
  const session = await requireRole("admin");
  const { id } = await props.params;
  const staff = await loadStaff(id, session);

  return (
    <div className="flex flex-col gap-6 py-8">
      <Link
        href="/admin/staff"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to staff
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {staff.avatar ? (
            <Image
              src={staff.avatar}
              alt={`Photo of ${staff.name}`}
              width={72}
              height={72}
              unoptimized
              className="size-18 rounded-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label="No photo"
              className="flex size-18 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <User size={32} aria-hidden="true" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{staff.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={staff.status} />
              <StatusBadge status={staff.isActive ? "Active" : "Inactive"} />
            </div>
          </div>
        </div>
        <StaffActiveButton id={staff.id} isActive={staff.isActive} />
      </div>

      <Card title="Profile">
        <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{staff.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{staff.phone}</dd>
          <dt className="text-muted-foreground">Skills</dt>
          <dd>{staff.skills.map((s) => s.title).join(", ")}</dd>
          <dt className="text-muted-foreground">Experience</dt>
          <dd>
            {staff.experienceYears}{" "}
            {staff.experienceYears === 1 ? "year" : "years"}
          </dd>
          <dt className="text-muted-foreground">Availability</dt>
          <dd>{staff.availability.join(", ")}</dd>
          <dt className="text-muted-foreground">Rating</dt>
          <dd>
            {staff.rating > 0
              ? `${staff.rating.toFixed(1)} / 5`
              : "No ratings yet"}
          </dd>
          <dt className="text-muted-foreground">Completed jobs</dt>
          <dd>{staff.completedJobs}</dd>
        </dl>
      </Card>

      <Card title="Current jobs">
        {staff.currentJobs.length === 0 ? (
          <p className="text-muted-foreground">No current or upcoming jobs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <caption className="sr-only">
                Current and upcoming jobs for {staff.name}
              </caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Booking
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Scheduled
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Booking status
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Their response
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.currentJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Link
                        href={`/admin/bookings/${job.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {job.id}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {dateTime(job.scheduledAt)}
                    </td>
                    <td className="py-3 pr-4">{job.customerName}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3">
                      {job.myStatus && (
                        <StatusBadge
                          status={job.myStatus}
                          distinguishAssigned
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Edit profile">
        <StaffEditForm
          staff={{
            id: staff.id,
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            avatar: staff.avatar,
            skillIds: staff.skills.map((s) => s.id),
            experienceYears: staff.experienceYears,
            availability: staff.availability,
          }}
        />
      </Card>
    </div>
  );
}
