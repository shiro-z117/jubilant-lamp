import { Tx, db } from "@/prisma/db";
import type { MCNotification } from "@/types/mcnotification";
import { NotFoundError } from "@/lib/apiResponse";
import { assertAdmin } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { ListNotificationsFilters } from "@/schemas/notification";

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

export async function listNotifications(filters: ListNotificationsFilters, session: Session) {
    assertAdmin(session);
    const { unread, type, page, limit } = filters;

    let query = db.orm.public.MCNotification.where({ userId: session.userId }); // only shows notifications for the currently logged in admin
    if (unread) query = query.where({ isRead: false });
    if (type) query = query.where({ type });

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(n) => n.createdAt.desc(), (n) => n.id.desc()])
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const items = rows.map((n) => ({
        id: n.id,
        type: n.type, // which event generated it
        bookingId: n.bookingId, // links to the booking it's about
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
    }));
    return { items, total, page, limit };
}

export async function markNotificationRead(notificationId: string, session: Session): Promise<void> {
    assertAdmin(session);

    const notification = await db.orm.public.MCNotification
        .where({ id: notificationId, userId: session.userId })
        .first();
    if (!notification) throw new NotFoundError("Notification not found");
    if (notification.isRead) return;

    await db.orm.public.MCNotification.where({ id: notificationId }).update({ isRead: true });
}

export async function markAllNotificationsRead(session: Session): Promise<void> {
    assertAdmin(session);

    await db.orm.public.MCNotification
        .where({ userId: session.userId, isRead: false })
        .updateAll({ isRead: true });
}