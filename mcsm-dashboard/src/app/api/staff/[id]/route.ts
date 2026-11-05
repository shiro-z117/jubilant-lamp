import { handle, ok } from "@/lib/apiResponse";
import { updateStaffSchema } from "@/schemas/staff";
import { requireApiRole } from "@/services/authService";
import { getStaff, updateStaff } from "@/services/staffService";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    return ok(await getStaff(id, session));
});

export const PATCH = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const input = updateStaffSchema.parse(await request.json());
    await updateStaff(id, input, session);
    return ok(await getStaff(id, session));
});