import { handle, ok } from "@/lib/apiResponse";
import { setStaffRequiredSchema } from "@/schemas/booking";
import { requireApiRole } from "@/services/authService";
import { getBooking, setStaffRequired } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const { count } = setStaffRequiredSchema.parse(await request.json());
    await setStaffRequired(id, count, session);
    return ok(await getBooking(id, session));
});