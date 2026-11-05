import { handle, ok } from "@/lib/apiResponse";
import { rejectQuote } from "@/services/quotationService";

type Ctx = { params: Promise<{ token: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
    const { token } = await params;
    await rejectQuote(token);
    return ok({ rejected: true });
});