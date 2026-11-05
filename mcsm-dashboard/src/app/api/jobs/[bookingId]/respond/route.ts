import { handle, ok } from "@/lib/apiResponse";
import { respondSchema } from "@/schemas/job";
import { requireApiRole } from "@/services/authService";
import { getMyJob, respondToJob } from "@/services/jobService";

type Ctx = { params: Promise<{ bookingId: string }> };

export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("staff");
    const { bookingId } = await params;
    const { accept } = respondSchema.parse(await request.json());
    await respondToJob(bookingId, accept, session);
    return ok(accept ? await getMyJob(bookingId, session) : { rejected: true });
});