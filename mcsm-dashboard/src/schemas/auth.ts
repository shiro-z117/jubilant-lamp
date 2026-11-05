import { z } from "zod";

export const loginSchema = z.object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(1, "Enter your password").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
    email: z.email("Enter a valid email address"),
});