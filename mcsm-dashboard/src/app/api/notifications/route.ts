import { handle, ok } from "@/lib/apiResponse";
import { listNotificationsSchema } from "@/schemas/notification";
import { requireApiRole } from "@/services/authService";
import { listNotifications } from "@/services/notificationService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const filters = listNotificationsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listNotifications(filters, session));
});