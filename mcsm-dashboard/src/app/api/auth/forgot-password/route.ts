import { handle, ok } from "@/lib/apiResponse";
import { forgotPasswordSchema } from "@/schemas/auth";

// no actual way to reset password, this is just a piece of UI flow and basically does nothing
export const POST = handle(async (request) => {
    forgotPasswordSchema.parse(await request.json());
    return ok({ message: "A reset link has been sent to your email (not actually but just pretend that it was)" });
});