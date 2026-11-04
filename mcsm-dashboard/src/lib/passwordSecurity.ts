// import "server-only"; TODO uncomment this (i can't figure out how to get this out of the way when i try to re-seed the database so it'll just stay commented for a while)
import bcrypt from "bcryptjs";

// used for new passwords made via forgot password, and for when new cleaners are created by an admin
export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

// used for login page
export function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}