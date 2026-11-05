import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getMyJob, startJob } from "@/services/jobService";

type Ctx = { params: Promise<{ bookingId: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("staff");
    const { bookingId } = await params;
    await startJob(bookingId, session);
    return ok(await getMyJob(bookingId, session));
});