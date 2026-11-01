import "server-only";
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/apiResponse";
import { db } from "@/prisma/db";

type Role = "admin" | "staff";

type Session = {
    userId: string;
    role: Role;
    staffId: string | null; // null for admins
};

const ROLE_HOME: Record<Role, string> = {
    admin: "/admin/dashboard",
    staff: "/staff/jobs",
};

// TODO: proper auth implementation, right now this is just a stub for testing role-based behavior

// TODO: replace with reading and verifying a session token, returning null when logged out.
// for now this just automatically logs you in as admin or staff based on your .env
export async function getSession(): Promise<Session | null> {
    if (process.env.DEV_ROLE === "staff") {
        const staff = await db.orm.public.Staff.where({ isActive: true }).first();
        if (!staff) return null;
        return { userId: staff.userId, role: "staff", staffId: staff.id };
    }

    const admin = await db.orm.public.User.where({ role: "admin" }).first();
    if (!admin) return null;
    return { userId: admin.id, role: "admin", staffId: null };
}

// for API route handlers: when trying to access a forbidden route, throws an error which handle() turns into 401 or 403
export async function requireApiRole(...roles: Role[]): Promise<Session> {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    if (!roles.includes(session.role)) throw new ForbiddenError();
    return session;
}

// for protected pages: redirects to /login if not logged in, otherwise redirects to the role's home if the route is not allowed for that role
export async function requireRole(role: Role): Promise<Session> {
    const session = await getSession();
    if (!session) redirect("/login");
    if (session.role !== role) redirect(ROLE_HOME[session.role]);
    return session;
}

// for the login page: logged-in users get bounced to their home
export async function redirectIfAuthenticated(): Promise<void> {
    const session = await getSession();
    if (session) redirect(ROLE_HOME[session.role]);
}

// for the root page "/": logged out goes to /login, otherwise to the role's home
export async function redirectToHome(): Promise<never> {
    const session = await getSession();
    redirect(session ? ROLE_HOME[session.role] : "/login");
}