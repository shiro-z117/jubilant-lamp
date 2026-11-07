import { handle, ok } from "@/lib/apiResponse";
import { calendarRangeSchema } from "@/schemas/calendar";
import { requireApiRole } from "@/services/authService";
import { getCalendarBookings } from "@/services/calendarService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const range = calendarRangeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await getCalendarBookings(range, session));
});