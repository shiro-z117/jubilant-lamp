import { db, type Tx } from "@/prisma/db";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { assertTransition } from "@/lib/bookingStatus";
import { notifyAdmins } from "@/services/notificationService";
import type { Session } from "@/services/authService";
import type { Booking } from "@/types/booking";
import type { ListBookingsFilters } from "@/schemas/booking";
import { getServiceById } from "@/lib/services";

const NEEDS_ACCEPTED_QUOTE: Status[] = ["Confirmed", "Assigned", "In Progress", "Completed"];
const EDITABLE: Status[] = ["Pending", "Quoted", "Confirmed", "Assigned"];
const ASSIGNABLE: Status[] = ["Confirmed", "Assigned"];

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

function assertAdmin(session: Session) {
    if (session.role !== "admin") throw new ForbiddenError("Only admins can do this");
}

async function addHistory(tx: Tx, bookingId: string, status: Status, changedBy: string, note: string | null = null) {
    await tx.orm.public.StatusHistory.create({ bookingId, status, changedBy, note });
}

async function loadBooking(tx: Tx, bookingId: string) {
    const booking = await tx.orm.public.Booking
        .where({ id: bookingId })
        .include("assignments")
        .include("quotations")
        .first();
    if (!booking) throw new NotFoundError("Booking not found");
    return booking;
}

// the status "Assigned" indicates that enough staff (staffRequired) have accepted to work on a particular booking
// unassigning staff who have accepted an assignment, or changing the staffRequired value can render the Assigned status invalid
// this function solves that by reverting a booking's status back to "Confirmed" if "Assigned" is no longer valid (should be called ANYWHERE that "Assigned" can be rendered invalid)
async function revertIfUnderstaffed(tx: Tx, bookingId: string, name: string) {
    const booking = await loadBooking(tx, bookingId);
    if (booking.status !== "Assigned") return;

    const accepted = booking.assignments.filter((a) => a.status === "Accepted" || a.status === "On the Way").length;
    if (accepted < booking.staffRequired) {
        // only admins can modify a booking in this way, so the status reversion is always logged as an admin action
        await applyStatusChange(tx, bookingId, "Confirmed", { actor: "admin", name });
    }
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
    if (endDate) {
        // end date should be inclusive, not exclusive (start date is automatically inclusive)
        const end = new Date(endDate);
        if (end.getTime() % 86_400_000 === 0) end.setUTCHours(23, 59, 59, 999);
        query = query.where((b) => b.scheduledAt.lte(end));
    }
    if (staffId) {
        query = query.where((b) =>
            b.assignments.some((a) =>
                session.role === "staff" ? and(a.staffId.eq(staffId), a.status.neq("Rejected")) : a.staffId.eq(staffId)
            )
        );
    }

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
    // flatmap functionally clears out invalid service types if one was somehow entered
    const services = booking.serviceIds.flatMap((id) => getServiceById(id) ?? []);

    // staff may only open bookings they are assigned to and haven't rejected
    if (session.role === "staff") {
        const mine = booking.assignments.find((a) => a.staffId === session.staffId);
        if (!mine || mine.status === "Rejected") throw new ForbiddenError();
    }

    return { ...booking, services };
}

// #endregion READ OPERATIONS

// #region WRITE OPERATIONS

export async function rescheduleBooking(bookingId: string, scheduledAt: Date, session: Session): Promise<void> {
    assertAdmin(session);
    await db.transaction(async (tx) => {
        const booking = await loadBooking(tx, bookingId);
        if (!EDITABLE.includes(booking.status)) {
            throw new ConflictError(`A ${booking.status} booking can no longer be rescheduled`);
        }
        if (scheduledAt.getTime() === booking.scheduledAt.getTime()) return booking; // nothing to change

        await tx.orm.public.Booking.where({ id: bookingId }).update({ scheduledAt });
        const by = await nameOf(tx, session.userId);
        await addHistory(
            tx, bookingId, booking.status, by,
            `Rescheduled: ${booking.scheduledAt.toISOString()} -> ${scheduledAt.toISOString()}`
        );
    });
}

export async function applyStatusChange(
    tx: Tx,
    bookingId: string,
    to: Status,
    who: { actor: Actor; name: string; staffId?: string }
) {
    const booking = await loadBooking(tx, bookingId);

    // a staff member may only change the status of a booking they have accepted
    if (who.actor === "staff") {
        const mine = booking.assignments.find((a) => a.staffId === who.staffId);
        if (!mine || (mine.status !== "Accepted" && mine.status !== "On the Way")) {
            throw new ForbiddenError("You have not accepted this booking");
        }
    }

    const note = assertTransition(booking.status, to, who.actor);

    // rules assertTransition can't check, because it never touches the database
    if (to === "Quoted" && booking.quotations.length === 0) {
        throw new ConflictError("Create a quotation before moving this booking to Quoted");
    }
    if (NEEDS_ACCEPTED_QUOTE.includes(to) && !booking.quotations.some((q) => q.status === "Accepted")) {
        throw new ConflictError("The customer must accept a quotation first");
    }
    if (to === "Assigned") {
        const accepted = booking.assignments.filter((a) => a.status === "Accepted" || a.status === "On the Way").length;
        if (accepted < booking.staffRequired) {
            throw new ConflictError(`${booking.staffRequired} staff must accept first (${accepted} so far)`);
        }
    }

    const updated = await tx.orm.public.Booking.where({ id: bookingId }).update({ status: to });
    await addHistory(tx, bookingId, to, who.name, note);

    if (to === "Completed") {
        await notifyAdmins(tx, "BookingCompleted", bookingId, `Booking ${bookingId} was completed`);
    }
    if (to === "Cancelled") {
        await notifyAdmins(tx, "BookingCancelled", bookingId, `Booking ${bookingId} was cancelled`);
    }
    return updated;
}

export async function changeBookingStatus(bookingId: string, to: Status, session: Session) {
    return db.transaction(async (tx) => {
        const name = await nameOf(tx, session.userId);
        return applyStatusChange(tx, bookingId, to, {
            actor: session.role,
            name,
            staffId: session.staffId ?? undefined,
        });
    });
}

export async function assignStaff(bookingId: string, staffIds: string[], session: Session) {
    assertAdmin(session);
    const ids = [...new Set(staffIds)];

    await db.transaction(async (tx) => {
        const booking = await loadBooking(tx, bookingId);
        if (!ASSIGNABLE.includes(booking.status)) {
            throw new ConflictError("Staff can only be assigned to Confirmed or Assigned bookings");
        }

        const staff = await tx.orm.public.Staff.where((s) => s.id.in(ids)).include("user").all();
        if (staff.length !== ids.length) throw new NotFoundError("One or more staff members were not found");
        if (staff.some((s) => !s.isActive)) throw new ConflictError("Inactive staff cannot be assigned");

        for (const s of staff) {
            const existing = booking.assignments.find((a) => a.staffId === s.id);
            if (existing && existing.status !== "Rejected") {
                throw new ConflictError(`${s.user.name} is already assigned`);
            }
            if (existing) {
                // someone who rejected earlier is being asked again
                await tx.orm.public.BookingAssignment.where({ bookingId, staffId: s.id }).update({ status: "Assigned" });
            } else {
                await tx.orm.public.BookingAssignment.create({ bookingId, staffId: s.id, status: "Assigned" });
            }
        }

        const by = await nameOf(tx, session.userId);
        await addHistory(tx, bookingId, booking.status, by, `Assigned: ${staff.map((s) => s.user.name).join(", ")}`);
    });
}

export async function unassignStaff(bookingId: string, staffId: string, session: Session) {
    assertAdmin(session);

    await db.transaction(async (tx) => {
        const booking = await loadBooking(tx, bookingId);
        if (!ASSIGNABLE.includes(booking.status)) {
            throw new ConflictError("Staff can only be removed before the job starts");
        }
        if (!booking.assignments.some((a) => a.staffId === staffId)) {
            throw new NotFoundError("That staff member is not assigned to this booking");
        }

        await tx.orm.public.BookingAssignment.where({ bookingId, staffId }).deleteAll();

        const staff = await tx.orm.public.Staff.where({ id: staffId }).include("user").first();
        const by = await nameOf(tx, session.userId);
        await addHistory(tx, bookingId, booking.status, by, `Unassigned: ${staff?.user.name ?? staffId}`);
        await revertIfUnderstaffed(tx, bookingId, by);
    });
}

export async function setStaffRequired(bookingId: string, count: number, session: Session) {
    assertAdmin(session);

    await db.transaction(async (tx) => {
        const booking = await loadBooking(tx, bookingId);
        if (!EDITABLE.includes(booking.status)) {
            throw new ConflictError("The staff requirement can only change before the job starts");
        }

        const { total } = await tx.orm.public.Staff.where({ isActive: true }).aggregate((a) => ({ total: a.count() }));
        if (count > total) throw new ConflictError(`Only ${total} active staff members exist`);

        await tx.orm.public.Booking.where({ id: bookingId }).update({ staffRequired: count });
        const by = await nameOf(tx, session.userId);
        await syncAssignedStatus(tx, bookingId); // lowered: may now qualify
        await revertIfUnderstaffed(tx, bookingId, by); // raised: may no longer qualify
    });
}

// moves Confirmed -> Assigned once enough staff have accepted. jobService should call this after each accept.
export async function syncAssignedStatus(tx: Tx, bookingId: string): Promise<boolean> {
    const booking = await loadBooking(tx, bookingId);
    if (booking.status !== "Confirmed") return false;

    const accepted = booking.assignments.filter((a) => a.status === "Accepted" || a.status === "On the Way").length;
    if (accepted < booking.staffRequired) return false;

    await applyStatusChange(tx, bookingId, "Assigned", { actor: "system", name: "System" });
    return true;
}

// #endregion WRITE OPERATIONS