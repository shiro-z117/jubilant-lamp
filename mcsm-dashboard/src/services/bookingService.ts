import { db, type Tx } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { assertTransition } from "@/lib/bookingStatus";
import { notifyAdmins } from "@/services/notificationService";
import type { Session } from "@/services/authService";
import type { Booking } from "@/types/booking";
import type { ListBookingsFilters } from "@/schemas/booking";
import { getServiceById } from "@/lib/services";

const NEEDS_ACCEPTED_QUOTE: Status[] = ["Confirmed", "Assigned", "In Progress", "Completed"];

type Status = Booking["status"];
type Actor = Parameters<typeof assertTransition>[2];

async function nameOf(tx: Tx, userId: string): Promise<string> {
    const user = await tx.orm.public.User.first({ id: userId });
    return user?.name ?? "Unknown";
}

// escapes % and _ so that search queries containing them don't do anything weird with the LIKE operator
function likePattern(text: string): string {
    return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

// #region READ OPERATIONS

export async function listBookings(filters: ListBookingsFilters, session: Session) {
    const { search, status, startDate, endDate, page, limit } = filters;

    // staff can only ever see their own assigned bookings
    if (session.role === "staff" && !session.staffId) throw new ForbiddenError();
    const staffId = session.role === "staff" ? session.staffId : filters.staffId;

    let query = db.orm.public.Booking.where({});

    if (status) query = query.where((b) => b.status.eq(status));
    if (startDate) query = query.where((b) => b.scheduledAt.gte(startDate));
    if (endDate) query = query.where((b) => b.scheduledAt.lte(endDate));
    if (staffId) query = query.where((b) => b.assignments.some((a) => a.staffId.eq(staffId)));

    if (search) {
        const pattern = likePattern(search);
        const customers = await db.orm.public.Customer.where((c) => c.name.ilike(pattern)).select("id").all();
        const customerIds = customers.map((c) => c.id);
        query = query.where((b) =>
            customerIds.length > 0 ? or(b.id.ilike(pattern), b.customerId.in(customerIds)) : b.id.ilike(pattern)
        );
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const items = await query
        .orderBy([(b) => b.createdAt.desc(), (b) => b.id.desc()])
        .include("customer")
        .include("assignments")
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    return { items, total, page, limit };
}

export async function getBooking(bookingId: string, session: Session) {
    if (session.role === "staff" && !session.staffId) throw new ForbiddenError();

    const booking = await db.orm.public.Booking
        .where({ id: bookingId })
        .include("customer")
        .include("assignments", (a) => a.include("staff"))
        .include("statusHistory", (h) => h.orderBy((x) => x.changedAt.asc()))
        .include("quotations")
        .include("payments")
        .first();
    if (!booking) throw new NotFoundError("Booking not found");
    const services = booking.serviceIds.map((id) => getServiceById(id));

    // staff may only open bookings they are assigned to and haven't rejected
    if (session.role === "staff") {
        const mine = booking.assignments.find((a) => a.staffId === session.staffId);
        if (!mine || mine.status === "Rejected") throw new ForbiddenError();
    }

    return { ...booking, services };
}

// #endregion READ OPERATIONS

// #region WRITE OPERATIONS

export async function createBooking() {

}

export async function updateBooking() {

}

export async function changeBookingStatus() {

}

export async function assignStaff() {

}

export async function unassignStaff() {

}

export async function setStaffRequired() {

}

export async function syncAssignedStatus() {

}

// #endregion WRITE OPERATIONS