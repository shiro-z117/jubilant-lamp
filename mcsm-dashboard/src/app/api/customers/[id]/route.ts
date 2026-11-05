import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getCustomer } from "@/services/customerService";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    return ok(await getCustomer(id, session));
});