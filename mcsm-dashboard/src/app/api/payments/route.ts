import { handle, ok } from "@/lib/apiResponse";
import { createPaymentSchema, listPaymentsSchema } from "@/schemas/payment";
import { requireApiRole } from "@/services/authService";
import { createPayment, listPayments } from "@/services/paymentService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("admin");
    const filters = listPaymentsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listPayments(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("admin");
    const input = createPaymentSchema.parse(await request.json());
    return ok(await createPayment(input, session), 201);
});