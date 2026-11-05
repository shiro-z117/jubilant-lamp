import { handle, ok } from "@/lib/apiResponse";
import { getCurrentUser } from "@/services/authService";

export const GET = handle(async () => ok(await getCurrentUser())); // throws 401 if logged out