type Role = "admin" | "staff";

// the client should never receive the password (even in its hashed state), it is stored in the database and checked on the server
// if the user is a deactivated staff member, their login should reject with an error "your account has been deactivated, contact an admin yada yada" (only if the login info is correct, otherwise give the standard "incorrect info" error)
export type User = {
    id: string;
    name: string; // full name as a single field
    email: string; // login identifier (must be unique)
    role: Role;
    createdAt: string; // ISO date-time
};