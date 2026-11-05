import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { markAllNotificationsRead } from "@/services/notificationService";

export const POST = handle(async () => {
    const session = await requireApiRole("admin");
    await markAllNotificationsRead(session);
    return ok({ allRead: true });
});