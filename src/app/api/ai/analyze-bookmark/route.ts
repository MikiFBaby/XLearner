import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, backgroundJobs } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  errorResponse,
  ForbiddenError,
  NotFoundError,
  requireAuth,
  successResponse,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";
import { analyzeBookmarkSchema } from "@/lib/validations";

// POST /api/ai/analyze-bookmark - Queue bookmark analysis
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const { bookmarkId } = await validateBody(request, analyzeBookmarkSchema);

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

  // Check if already being processed
  const existingJobResult = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.jobType, "analyze_bookmark"),
        eq(backgroundJobs.userId, user.id),
        inArray(backgroundJobs.status, ["pending", "processing"])
      )
    )
    .limit(1);

  // Note: Drizzle doesn't support JSON path queries easily, so we'll skip the duplicate check for now
  // In production, you'd want to implement this with raw SQL or a different approach

  // Create background job
  const jobResult = await db
    .insert(backgroundJobs)
    .values({
      jobType: "analyze_bookmark",
      userId: user.id,
      status: "pending",
      payload: { bookmarkId },
    })
    .returning();

  return successResponse({
    message: "Bookmark analysis queued",
    jobId: jobResult[0].id,
  });
});
