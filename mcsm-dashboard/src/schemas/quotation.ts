import { z } from "zod";

const cents = z.number().int().nonnegative(); // money is integer cents

export const createQuotationSchema = z.object({
    services: z.array(z.object({ serviceId: z.string(), price: cents })).min(1),
    addOns: z.array(z.object({ description: z.string().trim().min(1), amount: cents })).default([]), // size charge, extras
    discount: cents.default(0),
    taxRate: z.number().min(0).max(1).default(0), // 0.06 = 6%, applied after the discount
    expiresAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Expiry must be in the future"),
    notes: z.string().trim().nullable().default(null),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;