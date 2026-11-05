import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getMyJob } from "@/services/jobService";

type Ctx = { params: Promise<{ bookingId: string }> };

export const GET = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("staff");
    const { bookingId } = await params;
    return ok(await getMyJob(bookingId, session));
});