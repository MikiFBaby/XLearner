import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: {
        courseModules: {
          include: {
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    return successResponse(bookmark);
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

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    const data = await validateBody(request, updateBookmarkSchema);

    const updated = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        ...data,
        lastProcessedAt: new Date(),
      },
    });

    return successResponse(updated);
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

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    if (bookmark.userId !== user.id) {
      throw new ForbiddenError();
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return successResponse({ message: "Bookmark deleted" });
  }
);
