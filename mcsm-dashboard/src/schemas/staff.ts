import { z } from "zod";
import { SERVICES } from "@/lib/services";

const weekdaySchema = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const skillsSchema = z
    .array(z.string())
    .min(1, "Pick at least one skill")
    .refine((ids) => ids.every((id) => SERVICES.some((s) => s.id === id)), "Unknown service");

export const createStaffSchema = z.object({
    name: z.string().trim().min(1),
    email: z.email(),
    phone: z.string().trim().min(1),
    avatar: z.url().nullable().default(null), // image URL; null shows a placeholder
    skills: skillsSchema, // service ids only
    experienceYears: z.coerce.number().int().min(0),
    availability: z.array(weekdaySchema).min(1, "Pick at least one day"),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// no defaults, so a missing field means "leave unchanged"
export const updateStaffSchema = z
    .object({
        name: z.string().trim().min(1),
        email: z.email(),
        phone: z.string().trim().min(1),
        avatar: z.url().nullable(),
        skills: skillsSchema,
        experienceYears: z.coerce.number().int().min(0),
        availability: z.array(weekdaySchema).min(1),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const listStaffSchema = z.object({
    search: z.string().trim().min(1).optional(),
    status: z.enum(["Available", "Assigned", "Busy", "Offline"]).optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(), // query strings are text
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListStaffFilters = z.infer<typeof listStaffSchema>;

export const setActiveSchema = z.object({
    active: z.boolean(),
});