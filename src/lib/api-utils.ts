import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError, ZodSchema } from "zod";
import { authOptions } from "./auth";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

// ============================================================
// API Response Helpers
// ============================================================

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize);
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  });
}

// ============================================================
// Authentication Helpers
// ============================================================

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.twitterId) {
    return null;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.twitterId, session.user.twitterId))
    .limit(1);

  return result[0] || null;
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthenticationError("Unauthorized");
  }

  return user;
}

// ============================================================
// Validation Helpers
// ============================================================

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }
    throw new ValidationError("Invalid request body");
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }
    throw new ValidationError("Invalid query parameters");
  }
}

// ============================================================
// Custom Error Classes
// ============================================================

export class AuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ============================================================
// Error Handler Wrapper
// ============================================================

type ApiHandler = (
  request: Request,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof AuthenticationError) {
        return errorResponse(error.message, 401);
      }

      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400);
      }

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404);
      }

      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403);
      }

      return errorResponse("Internal server error", 500);
    }
  };
}
