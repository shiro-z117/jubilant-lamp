// converts Next.js searchParams into plain single string values, dropping empty ones
export function cleanParams(raw: Record<string, string | string[] | undefined>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        const first = Array.isArray(value) ? value[0] : value;
        if (first) params[key] = first;
    }
    return params;
}