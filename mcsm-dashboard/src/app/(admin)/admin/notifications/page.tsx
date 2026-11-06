import Link from "next/link";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import {
  MarkAllReadButton,
  MarkReadButton,
} from "@/components/notifications/NotificationButtons";
import { NOTIFICATION_LABELS } from "@/lib/notificationLabels";
import { listNotificationsSchema } from "@/schemas/notification";
import { requireRole } from "@/services/authService";
import { listNotifications } from "@/services/notificationService";

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function NotificationsPage(
  props: PageProps<"/admin/notifications">,
) {
  const session = await requireRole("admin");
  const raw = await props.searchParams;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params[key] = first;
  }
  const parsed = listNotificationsSchema.safeParse(params);
  const filters = parsed.success
    ? parsed.data
    : listNotificationsSchema.parse({});

  const [{ items, total, page, limit }, unread] = await Promise.all([
    listNotifications(filters, session),
    listNotifications({ unread: true, page: 1, limit: 1 }, session),
  ]);

  const filtered = Boolean(filters.unread || filters.type);

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground">{unread.total} unread</p>
        </div>
        <MarkAllReadButton disabled={unread.total === 0} />
      </div>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="unread" className="text-sm font-medium">
              Show
            </label>
            <select
              id="unread"
              name="unread"
              defaultValue={params.unread ?? ""}
              className={fieldClass}
            >
              <option value="">All</option>
              <option value="true">Unread only</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className="text-sm font-medium">
              Event
            </label>
            <select
              id="type"
              name="type"
              defaultValue={params.type ?? ""}
              className={fieldClass}
            >
              <option value="">All events</option>
              {Object.entries(NOTIFICATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
              ? "No notifications match these filters."
              : "You have no notifications yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((n) => (
              <li
                key={n.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-md border p-4 ${
                  n.isRead ? "border-border" : "border-primary bg-primary/5"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {!n.isRead && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        Unread
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {NOTIFICATION_LABELS[n.type]}
                    </span>
                    <time
                      dateTime={n.createdAt.toISOString()}
                      className="text-muted-foreground"
                    >
                      {dateTime(n.createdAt)}
                    </time>
                  </div>
                  <p className={n.isRead ? "" : "font-medium"}>{n.message}</p>
                  <Link
                    href={`/admin/bookings/${n.bookingId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View booking {n.bookingId}
                  </Link>
                </div>
                {!n.isRead && <MarkReadButton id={n.id} />}
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/admin/notifications"
          params={params}
        />
      </Card>
    </div>
  );
}
