import { handle, ok } from "@/lib/apiResponse";
import { rescheduleSchema } from "@/schemas/booking";
import { requireApiRole } from "@/services/authService";
import { getBooking, rescheduleBooking } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const { scheduledAt } = rescheduleSchema.parse(await request.json());
    await rescheduleBooking(id, scheduledAt, session);
    return ok(await getBooking(id, session));
});