import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getBooking, unassignStaff } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string; staffId: string }> };

export const DELETE = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id, staffId } = await params;
    await unassignStaff(id, staffId, session);
    return ok(await getBooking(id, session));
});