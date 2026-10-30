// TODO: uncomment the line below
// import "server-only";
import bcrypt from "bcryptjs";

// used for new passwords made via forgot password, and for when new cleaners are created by an admin
export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

// used for login page
export function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}