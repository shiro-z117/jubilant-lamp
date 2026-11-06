import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import JobCard, { type JobSummary } from "@/components/ui/JobCard";
import { requireRole } from "@/services/authService";
import { listMyJobs } from "@/services/jobService";

function Section(props: {
  title: string;
  jobs: JobSummary[];
  showDate: boolean;
  empty: string;
  intro?: ReactNode;
}) {
  const { title, jobs, showDate, empty, intro } = props;
  return (
    <Card title={title}>
      {intro}
      {jobs.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} showDate={showDate} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function StaffJobsPage() {
  const session = await requireRole("staff");
  const { today, needsResponse, upcoming, history, completedTotal } =
    await listMyJobs(session);
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">My jobs</h1>
        <p className="text-muted-foreground">{todayLabel}</p>
      </div>

      <Section
        title="Today's jobs"
        jobs={today}
        showDate={false}
        empty="No jobs are scheduled for you today."
      />
      <Section
        title="Waiting for your response"
        jobs={needsResponse}
        showDate
        empty="No assignments are waiting for you."
      />
      <Section
        title="Upcoming jobs"
        jobs={upcoming}
        showDate
        empty="No upcoming jobs."
      />
      <Section
        title="Job history"
        jobs={history}
        showDate
        empty="No past jobs yet."
        intro={
          <p className="mb-4 font-medium">
            Total jobs completed: {completedTotal}
          </p>
        }
      />
    </div>
  );
}
