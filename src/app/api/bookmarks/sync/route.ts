import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, bookmarks, backgroundJobs } from "@/lib/schema";
import { eq, desc, count, and, isNotNull } from "drizzle-orm";
import {
  errorResponse,
  requireAuth,
  successResponse,
  withErrorHandler,
} from "@/lib/api-utils";
import { fetchTwitterBookmarks, refreshTwitterToken } from "@/lib/twitter";

// POST /api/bookmarks/sync - Trigger bookmark sync from Twitter
export const POST = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Check if user has valid access token
  if (!user.accessToken) {
    return errorResponse("No Twitter access token found. Please re-authenticate.", 401);
  }

  // Check if token has expired and try to refresh
  if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
    if (user.refreshToken) {
      const newTokens = await refreshTwitterToken(
        user.refreshToken,
        process.env.TWITTER_CLIENT_ID!,
        process.env.TWITTER_CLIENT_SECRET!
      );

      if (newTokens) {
        await db
          .update(users)
          .set({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
          })
          .where(eq(users.id, user.id));

        user.accessToken = newTokens.accessToken;
      } else {
        return errorResponse("Twitter access token has expired. Please re-authenticate.", 401);
      }
    } else {
      return errorResponse("Twitter access token has expired. Please re-authenticate.", 401);
    }
  }

  // Fetch bookmarks from Twitter
  const { bookmarks: twitterBookmarks, error } = await fetchTwitterBookmarks(
    user.accessToken,
    user.twitterId
  );

  if (error) {
    // Create a failed job record
    await db.insert(backgroundJobs).values({
      jobType: "sync_bookmarks",
      userId: user.id,
      status: "failed",
      payload: { userId: user.id },
      error: error,
    });

    return errorResponse(error, 400);
  }

  // Insert or update bookmarks
  let newCount = 0;
  let updatedCount = 0;

  for (const bookmark of twitterBookmarks) {
    // Check if bookmark already exists
    const existing = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(eq(bookmarks.tweetId, bookmark.tweetId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing bookmark
      await db
        .update(bookmarks)
        .set({
          tweetText: bookmark.tweetText,
          tweetLikes: bookmark.tweetLikes,
          tweetRetweets: bookmark.tweetRetweets,
        })
        .where(eq(bookmarks.tweetId, bookmark.tweetId));
      updatedCount++;
    } else {
      // Insert new bookmark
      await db.insert(bookmarks).values({
        userId: user.id,
        tweetId: bookmark.tweetId,
        tweetText: bookmark.tweetText,
        tweetAuthorId: bookmark.tweetAuthorId,
        tweetAuthorName: bookmark.tweetAuthorName,
        tweetAuthorHandle: bookmark.tweetAuthorHandle,
        tweetCreatedAt: bookmark.tweetCreatedAt,
        tweetLikes: bookmark.tweetLikes,
        tweetRetweets: bookmark.tweetRetweets,
        tweetUrl: bookmark.tweetUrl,
        hasMedia: bookmark.hasMedia,
        mediaUrls: bookmark.mediaUrls,
      });
      newCount++;
    }
  }

  // Create a successful job record
  await db.insert(backgroundJobs).values({
    jobType: "sync_bookmarks",
    userId: user.id,
    status: "completed",
    payload: { userId: user.id },
    result: {
      totalFetched: twitterBookmarks.length,
      newBookmarks: newCount,
      updatedBookmarks: updatedCount,
    },
    completedAt: new Date(),
  });

  // Update user's last sync timestamp
  await db
    .update(users)
    .set({ lastSyncAt: new Date() })
    .where(eq(users.id, user.id));

  return successResponse({
    message: "Bookmark sync completed",
    totalFetched: twitterBookmarks.length,
    newBookmarks: newCount,
    updatedBookmarks: updatedCount,
  });
});

// GET /api/bookmarks/sync - Get sync status
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get the latest sync job for this user
  const latestJobResult = await db
    .select({
      id: backgroundJobs.id,
      status: backgroundJobs.status,
      result: backgroundJobs.result,
      error: backgroundJobs.error,
      createdAt: backgroundJobs.createdAt,
      completedAt: backgroundJobs.completedAt,
    })
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.userId, user.id),
        eq(backgroundJobs.jobType, "sync_bookmarks")
      )
    )
    .orderBy(desc(backgroundJobs.createdAt))
    .limit(1);

  const latestJob = latestJobResult[0] || null;

  // Get bookmark stats
  const bookmarkCountResult = await db
    .select({ count: count() })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id));

  const processedCountResult = await db
    .select({ count: count() })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, user.id),
        isNotNull(bookmarks.lastProcessedAt)
      )
    );

  return successResponse({
    latestJob,
    stats: {
      totalBookmarks: bookmarkCountResult[0]?.count || 0,
      processedBookmarks: processedCountResult[0]?.count || 0,
      lastSyncAt: user.lastSyncAt,
    },
  });
});
