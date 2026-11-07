import { z } from "zod";

const MAX_RANGE_DAYS = 45;

export const calendarRangeSchema = z
    .object({
        start: z.coerce.date(), // inclusive
        end: z.coerce.date(), // exclusive
    })
    .refine((r) => r.end > r.start, "End must be after start")
    .refine((r) => r.end.getTime() - r.start.getTime() <= MAX_RANGE_DAYS * 86_400_000, "That range is too long");

export type CalendarRange = z.infer<typeof calendarRangeSchema>;