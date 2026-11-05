import { db } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { NotFoundError } from "@/lib/apiResponse";
import { assertAdmin, likePattern } from "@/lib/serviceHelpers";
import { getServiceById } from "@/lib/services";
import type { Session } from "@/services/authService";
import type { Booking } from "@/types/booking";
import type { ListCustomersFilters } from "@/schemas/customer";

const CLOSED: Booking["status"][] = ["Completed", "Cancelled", "Rejected"];

// data derived from bookings and payments related to a customer
function statsOf(bookings: { status: Booking["status"]; payments: { status: string; amount: number }[] }[]) {
    const activeBookings = bookings.filter((b) => !CLOSED.includes(b.status)).length;
    const totalSpent = bookings
        .flatMap((b) => b.payments)
        .filter((p) => p.status === "Paid")
        .reduce((sum, p) => sum + p.amount, 0);

    return {
        bookingCount: bookings.length,
        activeBookings,
        pastBookings: bookings.length - activeBookings,
        totalSpent, // in cents
    };
}

// #region READ OPERATIONS

export async function listCustomers(filters: ListCustomersFilters, session: Session) {
    assertAdmin(session);
    const { search, activity, page, limit } = filters;

    let query = db.orm.public.Customer.where({});

    if (search) {
        const pattern = likePattern(search);
        query = query.where((c) => or(c.name.ilike(pattern), c.email.ilike(pattern), c.phone.ilike(pattern)));
    }

    // "active" means the customer has at least one unfinished booking, "past" means they have none
    if (activity) {
        const open = await db.orm.public.Booking.where((b) => b.status.notIn(CLOSED)).select("customerId").all();
        const activeIds = [...new Set(open.map((b) => b.customerId))];

        if (activity === "active") {
            if (activeIds.length === 0) return { items: [], total: 0, page, limit };
            query = query.where((c) => c.id.in(activeIds));
        } else if (activeIds.length > 0) {
            query = query.where((c) => c.id.notIn(activeIds));
        }
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const customers = await query
        .orderBy([(c) => c.name.asc(), (c) => c.id.asc()])
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    // one query for all bookings on this page, instead of one per customer
    const ids = customers.map((c) => c.id);
    const bookings =
        ids.length > 0
            ? await db.orm.public.Booking.where((b) => b.customerId.in(ids)).include("payments").all()
            : [];

    const items = customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        ...statsOf(bookings.filter((b) => b.customerId === c.id)),
    }));
    return { items, total, page, limit };
}

export async function getCustomer(customerId: string, session: Session) {
    assertAdmin(session);

    const customer = await db.orm.public.Customer.where({ id: customerId }).first();
    if (!customer) throw new NotFoundError("Customer not found");

    const bookings = await db.orm.public.Booking
        .where({ customerId })
        .orderBy((b) => b.scheduledAt.desc())
        .include("payments")
        .all();

    const summary = (b: (typeof bookings)[number]) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        status: b.status,
        services: b.serviceIds.flatMap((id) => getServiceById(id) ?? []),
    });

    const payments = bookings
        .flatMap((b) =>
            b.payments.map((p) => ({
                id: p.id,
                bookingId: b.id,
                amount: p.amount,
                method: p.method,
                status: p.status,
                date: p.paidAt ?? p.createdAt,
            }))
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        ...statsOf(bookings),
        activeBookings: bookings.filter((b) => !CLOSED.includes(b.status)).map(summary),
        pastBookings: bookings.filter((b) => CLOSED.includes(b.status)).map(summary),
        payments, // payment history, newest first
    };
}

// #endregion READ OPERATIONS