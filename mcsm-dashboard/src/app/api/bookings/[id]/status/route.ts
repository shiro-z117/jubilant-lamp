import { handle, ok } from "@/lib/apiResponse";
import { changeStatusSchema } from "@/schemas/booking";
import { requireApiRole } from "@/services/authService";
import { changeBookingStatus, getBooking } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string }> };

// approve/reject/cancel/complete and manual backward moves all go through here
export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const { status } = changeStatusSchema.parse(await request.json());
    await changeBookingStatus(id, status, session);
    return ok(await getBooking(id, session));
});