import { handle, ok } from "@/lib/apiResponse";
import { listBookingsSchema } from "@/schemas/booking";
import { requireApiRole } from "@/services/authService";
import { listBookings } from "@/services/bookingService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const filters = listBookingsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listBookings(filters, session));
});