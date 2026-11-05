import { z } from "zod";

export const listNotificationsSchema = z.object({
    unread: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    type: z
        .enum([
            "BookingRequested", "QuoteAccepted", "PaymentReceived", "StaffAccepted",
            "StaffRejected", "BookingCompleted", "BookingCancelled",
        ])
        .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListNotificationsFilters = z.infer<typeof listNotificationsSchema>;