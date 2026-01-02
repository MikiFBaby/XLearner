import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  errorResponse,
  requireAuth,
  successResponse,
  withErrorHandler,
} from "@/lib/api-utils";

// POST /api/bookmarks/sync - Trigger bookmark sync from Twitter
export const POST = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Check if user has valid access token
  if (!user.accessToken) {
    return errorResponse("No Twitter access token found. Please re-authenticate.", 401);
  }

  // Check if token has expired
  if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
    return errorResponse("Twitter access token has expired. Please re-authenticate.", 401);
  }

  // TODO: Queue background job to sync bookmarks
  // For now, we'll return a placeholder response

  // Create a background job record
  const job = await prisma.backgroundJob.create({
    data: {
      jobType: "sync_bookmarks",
      userId: user.id,
      status: "pending",
      payload: {
        userId: user.id,
        accessToken: "***", // Don't store the actual token in job payload
      },
    },
  });

  // Update user's last sync timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSyncAt: new Date() },
  });

  return successResponse({
    message: "Bookmark sync started",
    jobId: job.id,
    status: "pending",
  });
});

// GET /api/bookmarks/sync - Get sync status
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get the latest sync job for this user
  const latestJob = await prisma.backgroundJob.findFirst({
    where: {
      userId: user.id,
      jobType: "sync_bookmarks",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      result: true,
      error: true,
      createdAt: true,
      completedAt: true,
    },
  });

  // Get bookmark stats
  const bookmarkCount = await prisma.bookmark.count({
    where: { userId: user.id },
  });

  const processedCount = await prisma.bookmark.count({
    where: {
      userId: user.id,
      lastProcessedAt: { not: null },
    },
  });

  return successResponse({
    latestJob,
    stats: {
      totalBookmarks: bookmarkCount,
      processedBookmarks: processedCount,
      lastSyncAt: user.lastSyncAt,
    },
  });
});
