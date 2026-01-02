import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, moduleBookmarks, modules, courses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  errorResponse,
  ForbiddenError,
  NotFoundError,
  requireAuth,
  successResponse,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";
import { updateBookmarkSchema } from "@/lib/validations";

interface RouteContext {
  params: { id: string };
}

// GET /api/bookmarks/:id - Get single bookmark details
export const GET = withErrorHandler(
  async (_request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const bookmarkId = context?.params.id;

    if (!bookmarkId) {
      return errorResponse("Bookmark ID is required", 400);
    }

    const bookmarkResult = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    const bookmark = bookmarkResult[0];

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    // Get associated modules
    const courseModulesResult = await db
      .select({
        moduleId: moduleBookmarks.moduleId,
        moduleTitle: modules.title,
        courseId: courses.id,
        courseTitle: courses.title,
      })
      .from(moduleBookmarks)
      .innerJoin(modules, eq(moduleBookmarks.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(eq(moduleBookmarks.bookmarkId, bookmarkId));

    return successResponse({
      ...bookmark,
      courseModules: courseModulesResult,
    });
  }
);

// PATCH /api/bookmarks/:id - Update bookmark metadata
export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const bookmarkId = context?.params.id;

    if (!bookmarkId) {
      return errorResponse("Bookmark ID is required", 400);
    }

    const bookmarkResult = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    const bookmark = bookmarkResult[0];

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    const data = await validateBody(request, updateBookmarkSchema);

    const updatedResult = await db
      .update(bookmarks)
      .set({
        ...data,
        lastProcessedAt: new Date(),
      })
      .where(eq(bookmarks.id, bookmarkId))
      .returning();

    return successResponse(updatedResult[0]);
  }
);

// DELETE /api/bookmarks/:id - Remove bookmark
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const bookmarkId = context?.params.id;

    if (!bookmarkId) {
      return errorResponse("Bookmark ID is required", 400);
    }

    const bookmarkResult = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    const bookmark = bookmarkResult[0];

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

    return successResponse({ message: "Bookmark deleted" });
  }
);
