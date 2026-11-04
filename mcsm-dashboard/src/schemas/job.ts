import { z } from "zod";

export const respondSchema = z.object({
    accept: z.boolean(),
});