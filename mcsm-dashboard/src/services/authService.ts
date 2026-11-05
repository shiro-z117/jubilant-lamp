import "server-only";
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/apiResponse";
import { db } from "@/prisma/db";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { verifyPassword } from "@/lib/passwordSecurity";

type Role = "admin" | "staff";

export type Session = {
    userId: string;
    role: Role;
    staffId: string | null; // null for admins
};

const COOKIE_NAME = "session";
const SESSION_DAYS = 7; // you have to re-login after 7 days

const ROLE_HOME: Record<Role, string> = {
    admin: "/admin/dashboard",
    staff: "/staff/jobs",
};

// #region SESSION HANDLING

function secretKey(): Uint8Array {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
    return new TextEncoder().encode(secret);
}

async function readUserId(): Promise<string | null> {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;

    const key = secretKey();
    try {
        const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
        return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<Session | null> {
    const userId = await readUserId();
    if (!userId) return null;

    const user = await db.orm.public.User.first({ id: userId });
    if (!user) return null;

    if (user.role === "admin") return { userId: user.id, role: "admin", staffId: null };

    const staff = await db.orm.public.Staff.where({ userId: user.id }).first();
    if (!staff || !staff.isActive) return null;
    return { userId: user.id, role: "staff", staffId: staff.id };
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const user = await db.orm.public.User.first({ id: session.userId });
    if (!user) throw new UnauthorizedError();
    return { id: user.id, name: user.name, email: user.email, role: session.role, home: ROLE_HOME[session.role] };
}

// #endregion SESSION HANDLING

// #region LOGIN/LOGOUT

export async function login(email: string, password: string): Promise<{ role: Role; home: string }> {
    const user = await db.orm.public.User.where({ email: email.toLowerCase() }).first();
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !passwordOk) throw new UnauthorizedError("Invalid email or password");

    // only checked after the password is correct, so the message can't be used to probe emails
    if (user.role === "staff") {
        const staff = await db.orm.public.Staff.where({ userId: user.id }).first();
        if (!staff || !staff.isActive) {
            throw new ForbiddenError("Your account has been deactivated. Please contact an admin.");
        }
    }

    const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(secretKey());

    (await cookies()).set(COOKIE_NAME, token, {
        httpOnly: true, // not readable from browser JavaScript
        secure: process.env.NODE_ENV === "production", // https only when deployed
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return { role: user.role, home: ROLE_HOME[user.role] };
}

export async function logout(): Promise<void> {
    (await cookies()).delete(COOKIE_NAME);
}

// #endregion LOGIN/LOGOUT

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