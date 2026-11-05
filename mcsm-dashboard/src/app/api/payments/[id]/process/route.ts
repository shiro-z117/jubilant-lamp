import { handle, ok } from "@/lib/apiResponse";
import { processPaymentSchema } from "@/schemas/payment";
import { requireApiRole } from "@/services/authService";
import { processPayment } from "@/services/paymentService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const input = processPaymentSchema.parse(await request.json());
    await processPayment(id, input, session);
    return ok({ id, outcome: input.outcome });
});