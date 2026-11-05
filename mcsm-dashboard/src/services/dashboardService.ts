import { db } from "@/prisma/db";
import { assertAdmin } from "@/lib/serviceHelpers";
import { getServiceById } from "@/lib/services";
import type { Session } from "@/services/authService";

const DAY = 86_400_000; // 86,400,000 milliseconds in a day
const WINDOW_DAYS = 90; // graphs and charts cover business over the last 90 days

const STATUS_ORDER = ["Pending", "Quoted", "Confirmed", "Assigned", "In Progress", "Completed", "Cancelled", "Rejected"] as const;

const dayKey = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
const monthKey = (d: Date) => d.toISOString().slice(0, 7); // YYYY-MM

function windowStart(): Date {
    const d = new Date(Date.now() - (WINDOW_DAYS - 1) * DAY);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

// #region KPIs

export async function getDashboardKpis(session: Session) {
    assertAdmin(session);

    const bookings = await db.orm.public.Booking.select("status").all();
    const paid = await db.orm.public.Payment.where({ status: "Paid" }).select("amount").all();
    const { total: activeStaff } = await db.orm.public.Staff
        .where({ isActive: true })
        .aggregate((a) => ({ total: a.count() }));

    const count = (...statuses: string[]) => bookings.filter((b) => statuses.includes(b.status)).length;

    return {
        totalBookings: bookings.length, // every booking, including cancelled and rejected
        pendingRequests: count("Pending"),
        confirmedBookings: count("Confirmed", "Assigned"), // Assigned is a refinement of Confirmed
        completedJobs: count("Completed"),
        totalRevenue: paid.reduce((sum, p) => sum + p.amount, 0), // cents, Paid payments only
        activeStaff,
    };
}

// #endregion KPIs

// #region CHARTS

export async function getDashboardCharts(session: Session) {
    assertAdmin(session);
    const since = windowStart();

    // bookings over time: requests received per day
    const recent = await db.orm.public.Booking.where((b) => b.createdAt.gte(since)).select("createdAt").all();
    const perDay = new Map<string, number>();
    for (const b of recent) perDay.set(dayKey(b.createdAt), (perDay.get(dayKey(b.createdAt)) ?? 0) + 1);

    const bookingsOverTime = Array.from({ length: WINDOW_DAYS }, (_, i) => {
        const date = dayKey(new Date(Date.now() - (WINDOW_DAYS - 1 - i) * DAY));
        return { date, bookings: perDay.get(date) ?? 0 };
    });

    // monthly revenue: Paid payments in the window
    const paid = await db.orm.public.Payment
        .where({ status: "Paid" })
        .where((p) => p.paidAt.gte(since))
        .select("amount", "paidAt")
        .all();
    const perMonth = new Map<string, number>();
    for (const p of paid) {
        if (!p.paidAt) continue;
        perMonth.set(monthKey(p.paidAt), (perMonth.get(monthKey(p.paidAt)) ?? 0) + p.amount);
    }

    const months: string[] = [];
    const cursor = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), 1));
    const lastMonth = monthKey(new Date());
    while (monthKey(cursor) <= lastMonth) {
        months.push(monthKey(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const monthlyRevenue = months.map((month) => ({ month, revenue: perMonth.get(month) ?? 0 }));

    // status breakdown and most-requested services
    const all = await db.orm.public.Booking.select("status", "serviceIds").all();

    const statusBreakdown = STATUS_ORDER.map((status) => ({
        status,
        count: all.filter((b) => b.status === status).length,
    }));

    const perService = new Map<string, number>();
    for (const b of all) for (const id of b.serviceIds) perService.set(id, (perService.get(id) ?? 0) + 1);

    const topServices = [...perService.entries()]
        .map(([id, requests]) => ({ serviceId: id, title: getServiceById(id)?.title ?? id, requests }))
        .sort((a, b) => b.requests - a.requests);

    return { bookingsOverTime, monthlyRevenue, statusBreakdown, topServices };
}

// #endregion CHARTS

// #region TODAY'S OPERATIONS

export async function getTodaysOperations(session: Session) {
    assertAdmin(session);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const bookings = await db.orm.public.Booking
        .where((b) => b.scheduledAt.gte(start))
        .where((b) => b.scheduledAt.lte(end))
        .where((b) => b.status.notIn(["Cancelled", "Rejected"]))
        .orderBy((b) => b.scheduledAt.asc())
        .include("customer")
        .include("assignments")
        .all();

    // staff names live in User, so build one lookup instead of one query per booking
    const staffRows = await db.orm.public.Staff.include("user").all();
    const staffNames = new Map(staffRows.map((s) => [s.id, s.user.name]));

    return bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        customerName: b.customer.name,
        services: b.serviceIds.flatMap((id) => getServiceById(id)?.title ?? []),
        staff: b.assignments.filter((a) => a.status !== "Rejected").map((a) => staffNames.get(a.staffId) ?? "Unknown"),
        status: b.status,
    }));
}

// #endregion TODAY'S OPERATIONS