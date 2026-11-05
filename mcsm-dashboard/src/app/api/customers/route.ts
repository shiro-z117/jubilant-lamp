import { handle, ok } from "@/lib/apiResponse";
import { listCustomersSchema } from "@/schemas/customer";
import { requireApiRole } from "@/services/authService";
import { listCustomers } from "@/services/customerService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const filters = listCustomersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listCustomers(filters, session));
});