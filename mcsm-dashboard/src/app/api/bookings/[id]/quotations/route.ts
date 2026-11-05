import { handle, ok } from "@/lib/apiResponse";
import { createQuotationSchema } from "@/schemas/quotation";
import { requireApiRole } from "@/services/authService";
import { createQuotation } from "@/services/quotationService";

type Ctx = { params: Promise<{ id: string }> };

// creating a quote sends it: the booking moves to Quoted and the response carries the public token
export const POST = handle(async (request, { params }: Ctx) => {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const input = createQuotationSchema.parse(await request.json());
    return ok(await createQuotation(id, input, session), 201);
});