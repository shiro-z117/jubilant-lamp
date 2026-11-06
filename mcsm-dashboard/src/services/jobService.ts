import { db, type Tx } from "@/prisma/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/apiResponse";
import { applyStatusChange, getBooking, syncAssignedStatus } from "@/services/bookingService";
import { notifyAdmins } from "@/services/notificationService";
import type { Session } from "@/services/authService";
import { getServiceById } from "@/lib/services";
import { nameOf } from "@/lib/serviceHelpers";
import { and } from "@prisma/orm-postgres/orm-client";

// every function here is for staff only; returns the caller's Staff id
function requireStaff(session: Session): string {
    if (session.role !== "staff" || !session.staffId) throw new ForbiddenError("Staff only");
    return session.staffId;
}

// the booking plus this staff member's own assignment on it
async function loadMine(tx: Tx, bookingId: string, staffId: string) {
    const booking = await tx.orm.public.Booking.where({ id: bookingId }).include("assignments").first();
    if (!booking) throw new NotFoundError("Booking not found");
    const mine = booking.assignments.find((a) => a.staffId === staffId);
    if (!mine) throw new ForbiddenError("You are not assigned to this booking");
    return { booking, mine };
}

// accepting and travelling only make sense before the job starts
function assertOpen(status: string) {
    if (status !== "Confirmed" && status !== "Assigned") {
        throw new ConflictError(`This booking is ${status} and can no longer be changed`);
    }
}

// #region READ OPERATIONS

const CLOSED = ["Completed", "Cancelled", "Rejected"];
const HISTORY_LIMIT = 20;

// every job this staff member is on, grouped for the jobs page
export async function listMyJobs(session: Session) {
    const staffId = requireStaff(session);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const bookings = await db.orm.public.Booking
        .where((b) => b.assignments.some((a) => and(a.staffId.eq(staffId), a.status.neq("Rejected"))))
        .orderBy((b) => b.scheduledAt.asc())
        .include("customer")
        .include("assignments")
        .all();

    const jobs = bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        status: b.status,
        address: b.address,
        customerName: b.customer.name,
        services: b.serviceIds.flatMap((id) => getServiceById(id) ?? []),
        myStatus: b.assignments.find((a) => a.staffId === staffId)?.status, // drives the accept/reject/start buttons
    }));
    type Job = (typeof jobs)[number];

    const isToday = (j: Job) => j.scheduledAt >= start && j.scheduledAt <= end;
    const open = jobs.filter((j) => !CLOSED.includes(j.status));
    const closed = jobs.filter((j) => CLOSED.includes(j.status));
    const later = open.filter((j) => !isToday(j));

    return {
        today: open.filter(isToday),
        needsResponse: later.filter((j) => j.myStatus === "Assigned"),
        upcoming: later.filter((j) => j.myStatus !== "Assigned"),
        history: [...closed].reverse().slice(0, HISTORY_LIMIT),
        completedTotal: closed.filter(
            (j) => j.status === "Completed" && (j.myStatus === "Accepted" || j.myStatus === "On the Way")
        ).length,
    };
}

export async function getMyJob(bookingId: string, session: Session) {
    const staffId = requireStaff(session);
    const booking = await getBooking(bookingId, session); // throws if it isn't theirs or they rejected it

    // everyone on the job, pending assignments included, rejected ones left out
    const live = booking.assignments.filter((a) => a.status !== "Rejected");
    const staffRows = await db.orm.public.Staff.where((s) => s.id.in(live.map((a) => a.staffId))).include("user").all();
    const team = live
        .map((a) => ({
            staffId: a.staffId,
            name: staffRows.find((s) => s.id === a.staffId)?.user.name ?? "Unknown",
            status: a.status,
            isMe: a.staffId === staffId,
        }))
        .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));

    return {
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        address: booking.address,
        propertySize: booking.propertySize,
        accessNotes: booking.accessNotes,
        specialNotes: booking.specialNotes,
        pets: booking.pets,
        services: booking.services,
        customer: { name: booking.customer.name, phone: booking.customer.phone },
        myStatus: booking.assignments.find((a) => a.staffId === staffId)?.status,
        team,
    };
}

// #endregion READ OPERATIONS

// #region WRITE OPERATIONS

// Assigned -> Accepted or Rejected. accepting may move the booking to Assigned.
export async function respondToJob(bookingId: string, accept: boolean, session: Session): Promise<void> {
    const staffId = requireStaff(session);

    await db.transaction(async (tx) => {
        const { booking, mine } = await loadMine(tx, bookingId, staffId);
        assertOpen(booking.status);
        if (mine.status !== "Assigned") throw new ConflictError("You have already responded to this job");

        await tx.orm.public.BookingAssignment
            .where({ bookingId, staffId })
            .update({ status: accept ? "Accepted" : "Rejected" });

        const name = await nameOf(tx, session.userId);
        await notifyAdmins(
            tx,
            accept ? "StaffAccepted" : "StaffRejected",
            bookingId,
            `${name} ${accept ? "accepted" : "rejected"} job ${bookingId}`
        );

        if (accept) await syncAssignedStatus(tx, bookingId); // enough staff accepted? Confirmed -> Assigned
    });
}

// Accepted -> On the Way (this staff member's own progress)
export async function markOnTheWay(bookingId: string, session: Session): Promise<void> {
    const staffId = requireStaff(session);

    await db.transaction(async (tx) => {
        const { booking, mine } = await loadMine(tx, bookingId, staffId);
        assertOpen(booking.status);
        if (mine.status === "On the Way") throw new ConflictError("You are already on the way");
        if (mine.status !== "Accepted") throw new ConflictError("Accept this job first");

        await tx.orm.public.BookingAssignment.where({ bookingId, staffId }).update({ status: "On the Way" });
    });
}

// booking Assigned -> In Progress; applyStatusChange checks that this staff member has accepted
export async function startJob(bookingId: string, session: Session): Promise<void> {
    const staffId = requireStaff(session);

    await db.transaction(async (tx) => {
        const name = await nameOf(tx, session.userId);
        await applyStatusChange(tx, bookingId, "In Progress", { actor: "staff", name, staffId });
    });
}

// booking In Progress -> Completed (also notifies admins)
export async function completeJob(bookingId: string, session: Session): Promise<void> {
    const staffId = requireStaff(session);

    await db.transaction(async (tx) => {
        const name = await nameOf(tx, session.userId);
        await applyStatusChange(tx, bookingId, "Completed", { actor: "staff", name, staffId });
    });
}

// #endregion WRITE OPERATIONS