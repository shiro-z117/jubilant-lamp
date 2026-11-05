import { handle, ok } from "@/lib/apiResponse";
import { getQuoteByToken } from "@/services/quotationService";

type Ctx = { params: Promise<{ token: string }> };

export const GET = handle(async (_request, { params }: Ctx) => {
    const { token } = await params;
    return ok(await getQuoteByToken(token));
});