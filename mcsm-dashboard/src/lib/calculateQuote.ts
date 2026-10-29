// src/lib/calculateQuote.ts
import type { Quotation } from "@/types/quotation";

// all money values are integer cents (e.g. $10.00 = 1000); taxRate is a decimal fraction (e.g. 0.06)
type QuoteInput = Pick<Quotation, "services" | "addOns" | "discount" | "taxRate">;

// rounds up to the next whole cent
const ceilCents = (n: number) => Math.ceil(Number(n.toFixed(6)));

export function calculateQuote({ services, addOns, discount, taxRate }: QuoteInput) {
    const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.amount, 0);

    const subtotal = servicesTotal + addOnsTotal;
    const appliedDiscount = Math.min(discount, subtotal); // can't discount below zero
    const taxableAmount = subtotal - appliedDiscount;
    const tax = ceilCents(taxableAmount * taxRate);
    const total = taxableAmount + tax;

    return { subtotal, appliedDiscount, taxableAmount, tax, total };
}