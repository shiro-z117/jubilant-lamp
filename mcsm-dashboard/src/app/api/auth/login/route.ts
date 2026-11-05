import { handle, ok } from "@/lib/apiResponse";
import { loginSchema } from "@/schemas/auth";
import { login } from "@/services/authService";

export const POST = handle(async (request) => {
    const { email, password } = loginSchema.parse(await request.json());
    return ok(await login(email, password)); // { role, home }; the session cookie is set inside login()
});