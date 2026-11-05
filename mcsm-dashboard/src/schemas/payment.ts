import { z } from "zod";

const methodSchema = z.enum(["Card", "Cash", "Bank Transfer"]);

export const listPaymentsSchema = z.object({
    search: z.string().trim().min(1).optional(), // booking id or customer name
    status: z.enum(["Pending", "Paid", "Failed", "Refunded"]).optional(),
    method: methodSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPaymentsFilters = z.infer<typeof listPaymentsSchema>;

export const createPaymentSchema = z.object({
    bookingId: z.string(),
    method: methodSchema,
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const processPaymentSchema = z.object({
    outcome: z.enum(["success", "failure"]),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;