// src/lib/calculateQuote.ts
import type { Quotation } from "@/types/quotation";

type QuoteInput = Pick<Quotation, "services" | "addOns" | "discount" | "taxRate">;

// cleans up floating-point errors
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// rounds up to 2 decimals (to the next cent)
const ceil2 = (n: number) => Math.ceil(Number((n * 100).toFixed(6))) / 100;

export function calculateQuote({ services, addOns, discount, taxRate }: QuoteInput) {
    const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.amount, 0);

    const subtotal = round2(servicesTotal + addOnsTotal);
    const appliedDiscount = round2(Math.min(discount, subtotal)); // can't discount below zero
    const taxableAmount = round2(subtotal - appliedDiscount);
    const tax = ceil2(taxableAmount * taxRate); // the only line that can actually hold a fraction of a cent
    const total = round2(taxableAmount + tax);

    return { subtotal, appliedDiscount, taxableAmount, tax, total };
}