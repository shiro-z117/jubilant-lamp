import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { refundPayment } from "@/services/paymentService";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    await refundPayment(id, session);
    return ok({ id, refunded: true });
});