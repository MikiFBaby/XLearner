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
import { analyzeBookmarkSchema } from "@/lib/validations";

// POST /api/ai/analyze-bookmark - Queue bookmark analysis
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const { bookmarkId } = await validateBody(request, analyzeBookmarkSchema);

  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
  });

  if (!bookmark) {
    throw new NotFoundError("Bookmark");
  }

  if (bookmark.userId !== user.id) {
    throw new ForbiddenError();
  }

  // Check if already being processed
  const existingJob = await prisma.backgroundJob.findFirst({
    where: {
      jobType: "analyze_bookmark",
      userId: user.id,
      status: { in: ["pending", "processing"] },
      payload: {
        path: ["bookmarkId"],
        equals: bookmarkId,
      },
    },
  });

  if (existingJob) {
    return errorResponse("This bookmark is already being analyzed", 409);
  }

  // Create background job
  const job = await prisma.backgroundJob.create({
    data: {
      jobType: "analyze_bookmark",
      userId: user.id,
      status: "pending",
      payload: { bookmarkId },
    },
  });

  return successResponse({
    message: "Bookmark analysis queued",
    jobId: job.id,
  });
});
