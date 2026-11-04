import { ForbiddenError } from "@/lib/apiResponse";
import type { Tx } from "@/prisma/db";
import type { Session } from "@/services/authService";

export function assertAdmin(session: Session): void {
    if (session.role !== "admin") throw new ForbiddenError("Only admins can do this");
}

export async function nameOf(tx: Tx, userId: string): Promise<string> {
    const user = await tx.orm.public.User.first({ id: userId });
    return user?.name ?? "Unknown";
}

// escapes % and _ so that search queries containing them don't do anything weird with the LIKE operator
export function likePattern(text: string): string {
    return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}