import { handle, ok } from "@/lib/apiResponse";
import { assignStaffSchema } from "@/schemas/booking";
import { requireApiRole } from "@/services/authService";
import { assignStaff, getBooking } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const { staffIds } = assignStaffSchema.parse(await request.json());
    await assignStaff(id, staffIds, session);
    return ok(await getBooking(id, session));
});