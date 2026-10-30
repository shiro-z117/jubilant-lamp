import { z } from "zod";

export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(30, "Password must be at most 30 characters")
    .regex(/^[\x21-\x7E]+$/, "Password may only contain standard keyboard characters (excluding spaces)");