import { handle, ok } from "@/lib/apiResponse";
import { createStaffSchema, listStaffSchema } from "@/schemas/staff";
import { requireApiRole } from "@/services/authService";
import { createStaff, listStaff } from "@/services/staffService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const filters = listStaffSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listStaff(filters, session));
});

// the response includes the generated password for the user to save somewhere
export const POST = handle(async (request) => {
    const session = await requireApiRole("admin");
    const input = createStaffSchema.parse(await request.json());
    return ok(await createStaff(input, session), 201);
});