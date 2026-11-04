import { randomBytes } from "node:crypto";
import { db } from "@/prisma/db";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/apiResponse";
import { calculateQuote } from "@/lib/calculateQuote";
import { getServiceById } from "@/lib/services";
import { applyStatusChange } from "@/services/bookingService";
import { notifyAdmins } from "@/services/notificationService";
import type { Session } from "@/services/authService";
import type { CreateQuotationInput } from "@/schemas/quotation";
import { assertAdmin, nameOf } from "@/lib/serviceHelpers";

// a Sent quote past its expiry date counts as Expired, even if the stored status hasn't been updated yet
function effectiveStatus(q: { status: string; expiresAt: Date }): string {
    return q.status === "Sent" && q.expiresAt.getTime() < Date.now() ? "Expired" : q.status;
}

// the line-by-line breakdown the quote screens show (all amounts in cents)
function breakdownOf(q: {
    services: { serviceId: string; price: number }[];
    addOns: { description: string; amount: number }[];
    discount: number;
    taxRate: number;
}) {
    const calc = calculateQuote({ services: q.services, addOns: q.addOns, discount: q.discount, taxRate: q.taxRate });
    return {
        services: q.services.map((s) => ({
            serviceId: s.serviceId,
            title: getServiceById(s.serviceId)?.title ?? s.serviceId,
            price: s.price,
        })),
        addOns: q.addOns.map((a) => ({ description: a.description, amount: a.amount })),
        taxRate: q.taxRate,
        ...calc, // subtotal, appliedDiscount, taxableAmount, tax, total
    };
}

// public lookup by token; marks an out-of-date quote as Expired
async function loadByToken(token: string) {
    const quote = await db.orm.public.Quotation
        .where({ token })
        .include("services")
        .include("addOns")
        .first();
    if (!quote) throw new NotFoundError("Quote not found");

    if (effectiveStatus(quote) === "Expired" && quote.status !== "Expired") {
        await db.orm.public.Quotation.where({ id: quote.id }).update({ status: "Expired" });
        return { ...quote, status: "Expired" as const };
    }
    return quote;
}

function assertAnswerable(quote: { status: string }) {
    if (quote.status === "Expired") throw new ConflictError("This quote has expired");
    if (quote.status !== "Sent") throw new ConflictError(`This quote was already ${quote.status.toLowerCase()}`);
}

// #region ADMIN

// creating a quote sends it. A booking can have several over time, but only one live (Sent) at a time.
export async function createQuotation(bookingId: string, input: CreateQuotationInput, session: Session) {
    assertAdmin(session);

    return db.transaction(async (tx) => {
        const booking = await tx.orm.public.Booking.where({ id: bookingId }).include("quotations").first();
        if (!booking) throw new NotFoundError("Booking not found");
        if (booking.status !== "Pending" && booking.status !== "Quoted") {
            throw new ConflictError(`A ${booking.status} booking cannot be quoted`);
        }

        if (booking.quotations.some((q) => q.status === "Accepted")) {
            throw new ConflictError("This booking already has an accepted quotation");
        }

        // a live quote blocks a new one; an out-of-date one is retired
        for (const q of booking.quotations.filter((q) => q.status === "Sent")) {
            if (q.expiresAt.getTime() > Date.now()) {
                throw new ConflictError("A quote is already waiting for the customer's answer");
            }
            await tx.orm.public.Quotation.where({ id: q.id }).update({ status: "Expired" });
        }

        // the lines must cover exactly the booking's services
        const lineIds = input.services.map((s) => s.serviceId);
        const sameServices =
            lineIds.length === booking.serviceIds.length && booking.serviceIds.every((id) => lineIds.includes(id));
        if (!sameServices) throw new BadRequestError("Quote lines must match the booking's services");

        const calc = calculateQuote(input);
        if (input.discount > calc.subtotal) throw new BadRequestError("Discount cannot exceed the subtotal");

        const quote = await tx.orm.public.Quotation.create({
            bookingId,
            token: randomBytes(16).toString("hex"),
            discount: input.discount,
            taxRate: input.taxRate,
            total: calc.total,
            expiresAt: input.expiresAt,
            notes: input.notes,
            status: "Sent",
        });
        await tx.orm.public.QuoteServiceLine.createAll(
            input.services.map((s) => ({ quotationId: quote.id, serviceId: s.serviceId, price: s.price }))
        );
        if (input.addOns.length > 0) {
            await tx.orm.public.QuoteAddOn.createAll(
                input.addOns.map((a) => ({ quotationId: quote.id, description: a.description, amount: a.amount }))
            );
        }

        // first quote: Pending -> Quoted (a revised quote leaves the booking at Quoted)
        if (booking.status === "Pending") {
            const name = await nameOf(tx, session.userId);
            await applyStatusChange(tx, bookingId, "Quoted", { actor: "admin", name });
        }

        return { id: quote.id, token: quote.token };
    });
}

export async function getQuotation(quotationId: string, session: Session) {
    assertAdmin(session);

    const quote = await db.orm.public.Quotation
        .where({ id: quotationId })
        .include("services")
        .include("addOns")
        .include("booking", (b) => b.include("customer"))
        .first();
    if (!quote) throw new NotFoundError("Quotation not found");
    if (!quote.booking) throw new NotFoundError("Booking not found");

    return {
        id: quote.id,
        bookingId: quote.bookingId,
        token: quote.token, // the admin shares the mock acceptance link built from this
        customerName: quote.booking.customer.name,
        status: effectiveStatus(quote),
        expiresAt: quote.expiresAt,
        createdAt: quote.createdAt,
        notes: quote.notes,
        breakdown: breakdownOf(quote),
    };
}

// #endregion ADMIN

// #region PUBLIC (the token in the URL)

export async function getQuoteByToken(token: string) {
    const quote = await loadByToken(token);
    const booking = await db.orm.public.Booking.where({ id: quote.bookingId }).include("customer").first();
    if (!booking) throw new NotFoundError("Booking not found");

    return {
        bookingId: booking.id,
        customerName: booking.customer.name,
        address: booking.address,
        scheduledAt: booking.scheduledAt,
        status: quote.status,
        expiresAt: quote.expiresAt,
        notes: quote.notes,
        breakdown: breakdownOf(quote),
    };
}

// customer accepts: quote Accepted, booking Quoted -> Confirmed, admins notified
export async function acceptQuote(token: string): Promise<void> {
    const quote = await loadByToken(token);
    assertAnswerable(quote);

    await db.transaction(async (tx) => {
        // re-check inside the transaction in case two answers arrive at once
        const fresh = await tx.orm.public.Quotation.where({ id: quote.id }).first();
        if (!fresh || fresh.status !== "Sent") throw new ConflictError("This quote can no longer be accepted");

        await tx.orm.public.Quotation.where({ id: quote.id }).update({ status: "Accepted" });
        await applyStatusChange(tx, quote.bookingId, "Confirmed", { actor: "system", name: "Customer" });

        const booking = await tx.orm.public.Booking.where({ id: quote.bookingId }).include("customer").first();
        await notifyAdmins(
            tx,
            "QuoteAccepted",
            quote.bookingId,
            `${booking?.customer.name ?? "The customer"} accepted the quote for ${quote.bookingId}`
        );
    });
}

// customer declines: quote Rejected, booking cancelled (applyStatusChange notifies admins)
export async function rejectQuote(token: string): Promise<void> {
    const quote = await loadByToken(token);
    assertAnswerable(quote);

    await db.transaction(async (tx) => {
        const fresh = await tx.orm.public.Quotation.where({ id: quote.id }).first();
        if (!fresh || fresh.status !== "Sent") throw new ConflictError("This quote can no longer be declined");

        await tx.orm.public.Quotation.where({ id: quote.id }).update({ status: "Rejected" });
        await applyStatusChange(tx, quote.bookingId, "Cancelled", { actor: "system", name: "Customer" });
    });
}

// #endregion PUBLIC