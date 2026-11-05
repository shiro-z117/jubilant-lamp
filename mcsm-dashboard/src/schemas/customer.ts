import { z } from "zod";

export const listCustomersSchema = z.object({
    search: z.string().trim().min(1).optional(), // name, email, or phone
    activity: z.enum(["active", "past"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListCustomersFilters = z.infer<typeof listCustomersSchema>;