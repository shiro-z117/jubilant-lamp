import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getBooking } from "@/services/bookingService";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    return ok(await getBooking(id, session));
});