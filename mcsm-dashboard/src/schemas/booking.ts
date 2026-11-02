import { z } from "zod";

const bookingStatusSchema = z.enum([
    "Pending", "Quoted", "Confirmed", "Assigned", "In Progress", "Completed", "Cancelled", "Rejected",
]);

export const listBookingsSchema = z.object({
    search: z.string().trim().min(1).optional(), // booking id or customer name
    status: bookingStatusSchema.optional(),
    staffId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListBookingsFilters = z.infer<typeof listBookingsSchema>;