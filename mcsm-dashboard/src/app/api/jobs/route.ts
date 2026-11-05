import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { listMyJobs } from "@/services/jobService";

export const GET = handle(async () => {
    const session = await requireApiRole("staff");
    return ok(await listMyJobs(session));
});