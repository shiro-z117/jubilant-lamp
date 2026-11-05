import { handle, ok } from "@/lib/apiResponse";
import { logout } from "@/services/authService";

export const POST = handle(async () => {
    await logout();
    return ok({ loggedOut: true });
});