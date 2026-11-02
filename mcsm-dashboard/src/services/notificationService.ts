import type { Tx } from "@/prisma/db";
import type { MCNotification } from "@/types/mcnotification";

// notifications are for admins only (staff are notified of their assignments but that uses a different mechanism)
// one unread notification per admin (so that multiple admins can be notified of the same event without going "oh i already read that" when they actually didn't)
export async function notifyAdmins(
    tx: Tx,
    type: MCNotification["type"],
    bookingId: string,
    message: string
): Promise<void> {
    const admins = await tx.orm.public.User.where({ role: "admin" }).all();
    if (admins.length === 0) return; // if there are no admins then you can't send them a notification so just return immediately; practically, this shouldn't really ever happen

    await tx.orm.public.MCNotification.createAll(
        admins.map((admin) => ({
            userId: admin.id,
            type,
            bookingId,
            message,
            isRead: false,
        }))
    );
}