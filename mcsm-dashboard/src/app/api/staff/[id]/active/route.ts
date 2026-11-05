import { handle, ok } from "@/lib/apiResponse";
import { setActiveSchema } from "@/schemas/staff";
import { requireApiRole } from "@/services/authService";
import { getStaff, setStaffActive } from "@/services/staffService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const { active } = setActiveSchema.parse(await request.json());
    await setStaffActive(id, active, session);
    return ok(await getStaff(id, session));
});