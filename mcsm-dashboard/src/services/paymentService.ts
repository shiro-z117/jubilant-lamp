import { db } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";
import { assertAdmin, likePattern } from "@/lib/serviceHelpers";
import { notifyAdmins } from "@/services/notificationService";
import type { Session } from "@/services/authService";
import type { CreatePaymentInput, ListPaymentsFilters, ProcessPaymentInput } from "@/schemas/payment";

// #region READ OPERATIONS

export async function listPayments(filters: ListPaymentsFilters, session: Session) {
    assertAdmin(session);
    const { search, status, method, page, limit } = filters;

    let query = db.orm.public.Payment.where({});
    if (status) query = query.where({ status });
    if (method) query = query.where({ method });

    if (search) {
        // customer names live two tables away: matching customers -> their bookings -> payments
        const pattern = likePattern(search);
        const customers = await db.orm.public.Customer.where((c) => c.name.ilike(pattern)).select("id").all();
        const customerIds = customers.map((c) => c.id);
        const bookings =
            customerIds.length > 0
                ? await db.orm.public.Booking.where((b) => b.customerId.in(customerIds)).select("id").all()
                : [];
        const bookingIds = bookings.map((b) => b.id);
        query = query.where((p) =>
            bookingIds.length > 0 ? or(p.bookingId.ilike(pattern), p.bookingId.in(bookingIds)) : p.bookingId.ilike(pattern)
        );
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(p) => p.createdAt.desc(), (p) => p.id.desc()])
        .include("booking", (b) => b.include("customer"))
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const items = rows.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        customerName: p.booking?.customer.name ?? "Unknown",
        amount: p.amount, // cents
        method: p.method,
        status: p.status,
        date: p.paidAt ?? p.createdAt,
    }));
    return { items, total, page, limit };
}

// #endregion READ OPERATIONS

// #region WRITE OPERATIONS

// opens a Pending payment for the booking's accepted quote total
export async function createPayment(input: CreatePaymentInput, session: Session): Promise<{ id: string }> {
    assertAdmin(session);
    const { bookingId, method } = input;

    return db.transaction(async (tx) => {
        const booking = await tx.orm.public.Booking
            .where({ id: bookingId })
            .include("quotations")
            .include("payments")
            .first();
        if (!booking) throw new NotFoundError("Booking not found");
        if (booking.status === "Cancelled" || booking.status === "Rejected") {
            throw new ConflictError(`A ${booking.status} booking cannot take payments`);
        }

        const quote = booking.quotations.find((q) => q.status === "Accepted");
        if (!quote) throw new ConflictError("The customer must accept a quotation before payment");
        if (booking.payments.some((p) => p.status === "Pending" || p.status === "Paid")) {
            throw new ConflictError("This booking already has a pending or paid payment");
        }

        const payment = await tx.orm.public.Payment.create({
            bookingId,
            amount: quote.total,
            method,
            status: "Pending",
            paidAt: null,
        });
        return { id: payment.id };
    });
}

export async function processPayment(paymentId: string, input: ProcessPaymentInput, session: Session): Promise<void> {
    assertAdmin(session);

    await db.transaction(async (tx) => {
        const payment = await tx.orm.public.Payment.where({ id: paymentId }).first();
        if (!payment) throw new NotFoundError("Payment not found");
        if (payment.status !== "Pending" && payment.status !== "Failed") {
            throw new ConflictError(`A ${payment.status} payment cannot be processed`);
        }

        if (input.outcome === "failure") {
            if (payment.method === "Cash") throw new BadRequestError("Cash payments cannot fail");
            await tx.orm.public.Payment.where({ id: paymentId }).update({ status: "Failed" });
            return;
        }

        await tx.orm.public.Payment.where({ id: paymentId }).update({ status: "Paid", paidAt: new Date() });
        await notifyAdmins(
            tx,
            "PaymentReceived",
            payment.bookingId,
            `Payment of ${centsToUSD(payment.amount)} received for ${payment.bookingId}`
        );
    });
}

// Paid -> Refunded
export async function refundPayment(paymentId: string, session: Session): Promise<void> {
    assertAdmin(session);

    const payment = await db.orm.public.Payment.where({ id: paymentId }).first();
    if (!payment) throw new NotFoundError("Payment not found");
    if (payment.status !== "Paid") throw new ConflictError("Only a paid payment can be refunded");

    await db.orm.public.Payment.where({ id: paymentId }).update({ status: "Refunded" });
}

// #endregion WRITE OPERATIONS