import { db } from "@/prisma/db";
import { assertAdmin } from "@/lib/serviceHelpers";
import { getServiceById } from "@/lib/services";
import type { CalendarRange } from "@/schemas/calendar";
import type { Session } from "@/services/authService";

// every booking scheduled in [start, end), with what the calendar's detail popup shows
export async function getCalendarBookings(range: CalendarRange, session: Session) {
    assertAdmin(session);
    const { start, end } = range;

    const bookings = await db.orm.public.Booking
        .where((b) => b.scheduledAt.gte(start))
        .where((b) => b.scheduledAt.lt(end))
        .orderBy((b) => b.scheduledAt.asc())
        .include("customer")
        .include("assignments")
        .include("quotations")
        .all();

    // staff names live on User, so build one lookup instead of one query per booking
    const staffRows = await db.orm.public.Staff.include("user").all();
    const staffNames = new Map(staffRows.map((s) => [s.id, s.user.name]));

    return bookings.map((b) => {
        // the price is the accepted quote, or else the quote still waiting for an answer
        const accepted = b.quotations.find((q) => q.status === "Accepted");
        const sent = b.quotations.find((q) => q.status === "Sent");
        const price = accepted
            ? { amount: accepted.total, state: "Accepted" as const }
            : sent
                ? { amount: sent.total, state: "Sent" as const }
                : null;

        return {
            id: b.id,
            scheduledAt: b.scheduledAt,
            status: b.status,
            address: b.address,
            customerName: b.customer.name,
            customerPhone: b.customer.phone,
            services: b.serviceIds.flatMap((id) => getServiceById(id)?.title ?? []),
            staff: b.assignments
                .filter((a) => a.status !== "Rejected")
                .map((a) => ({ name: staffNames.get(a.staffId) ?? "Unknown", status: a.status })),
            price,
        };
    });
}