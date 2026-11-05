import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { markNotificationRead } from "@/services/notificationService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    await markNotificationRead(id, session);
    return ok({ id, isRead: true });
});