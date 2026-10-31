import { NextResponse } from "next/server";
import { ZodError } from "zod";

// more error types to be handled can be added here, then make a new error class extending ApiError to address that error type
// any errors not directly accounted for will be treated as 500
const STATUS_BY_CODE = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL: 500,
} as const;

type ErrorCode = keyof typeof STATUS_BY_CODE;

interface ApiSuccess<TData> {
    success: true;
    data: TData;
}

interface ApiFailure {
    success: false;
    error: {
        message: string;
        code: ErrorCode;
        status: number;
        details?: Record<string, string[]>; // describes the thing(s) that caused the api failure
    };
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

// #region ERRORS

// base error class to be extended from
abstract class ApiError extends Error {
    constructor(
        message: string,
        public code: ErrorCode,
        public details?: Record<string, string[]>
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends ApiError {
    constructor(message = "Invalid request", details?: Record<string, string[]>) {
        super(message, "BAD_REQUEST", details);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = "You must be logged in") {
        super(message, "UNAUTHORIZED");
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = "You do not have permission to do this") {
        super(message, "FORBIDDEN");
    }
}

export class NotFoundError extends ApiError {
    constructor(message = "Not found") {
        super(message, "NOT_FOUND");
    }
}

export class ConflictError extends ApiError {
    constructor(message = "This action conflicts with the current state") {
        super(message, "CONFLICT");
    }
}

// #endregion

// #region RESPONSE HELPERS

export function ok<TData>(data: TData, status = 200) {
    const body: ApiResponse<TData> = { success: true, data };
    return NextResponse.json(body, { status });
}

function fail(code: ErrorCode, message: string, details?: Record<string, string[]>) {
    const status = STATUS_BY_CODE[code];
    const body: ApiResponse<never> = { success: false, error: { message, code, status, details } };
    return NextResponse.json(body, { status });
}

// converts anything that was thrown into an http response
function toErrorResponse(error: unknown) {
    if (error instanceof ApiError) {
        return fail(error.code, error.message, error.details);
    }

    // for when data is parsed but is invalid (doesn't match the zod schema of its respective type)
    if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
            const field = issue.path.join(".") || "_";
            (details[field] ??= []).push(issue.message);
        }
        return fail("BAD_REQUEST", "Invalid input", details);
    }

    // json() throws a SyntaxError when the body isn't valid JSON
    if (error instanceof SyntaxError) {
        return fail("BAD_REQUEST", "Request body must be valid JSON");
    }

    // anything i didn't account for or expect gets caught here and gets a generic 500 error
    console.error(error);
    return fail("INTERNAL", "Something went wrong");
}

// #endregion

// a wrapper so that try/catch blocks aren't needed for every api method and also sends caught errors through toErrorResponse
// example usage: export const GET = handle(async (request, context) => { ...; return ok(data); });
export function handle<TContext>(
    handler: (request: Request, context: TContext) => Promise<Response>
) {
    return async (request: Request, context: TContext): Promise<Response> => {
        try {
            return await handler(request, context);
        } catch (error) {
            return toErrorResponse(error);
        }
    };
}