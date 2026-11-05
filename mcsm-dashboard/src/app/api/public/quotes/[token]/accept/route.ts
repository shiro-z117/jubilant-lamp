import { handle, ok } from "@/lib/apiResponse";
import { acceptQuote } from "@/services/quotationService";

type Ctx = { params: Promise<{ token: string }> };

export const POST = handle(async (_request, { params }: Ctx) => {
    const { token } = await params;
    await acceptQuote(token);
    return ok({ accepted: true });
});