import StatusBadge from "@/components/ui/StatusBadge";

type Entry = {
  id: string;
  status: string;
  changedAt: Date;
  changedBy: string;
  note: string | null;
};

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

// newest-oldest from top-bottom
export default function StatusTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0)
    return <p className="text-muted-foreground">No status changes recorded.</p>;

  return (
    <ol className="flex flex-col">
      {[...entries].reverse().map((e, i, all) => (
        <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
          {i < all.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-6 bottom-0 left-2 w-px bg-border"
            />
          )}
          <span
            aria-hidden="true"
            className="relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-2 border-primary bg-card"
          />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={e.status} />
              <time
                dateTime={e.changedAt.toISOString()}
                className="text-sm text-muted-foreground"
              >
                {dateTime(e.changedAt)}
              </time>
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">By </span>
              {e.changedBy}
            </p>
            {e.note && (
              <p className="text-sm text-muted-foreground">{e.note}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
