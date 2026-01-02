import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/schema";
import { eq, and, gte, lte, ilike, isNull, isNotNull, desc, asc, count, sql } from "drizzle-orm";
import {
  paginatedResponse,
  requireAuth,
  validateQuery,
  withErrorHandler,
} from "@/lib/api-utils";
import { bookmarkFilterSchema } from "@/lib/validations";

// GET /api/bookmarks - List user's bookmarks with filtering and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const filters = validateQuery(searchParams, bookmarkFilterSchema);

  // Build where conditions
  const conditions = [eq(bookmarks.userId, user.id)];

  if (filters.topics) {
    const topicsArray = filters.topics.split(",").map((t) => t.trim());
    // Check if any of the topics match
    conditions.push(sql`${bookmarks.topics} && ARRAY[${sql.join(topicsArray.map(t => sql`${t}`), sql`, `)}]::text[]`);
  }

  if (filters.author) {
    conditions.push(ilike(bookmarks.tweetAuthorHandle, `%${filters.author}%`));
  }

  if (filters.dateFrom) {
    conditions.push(gte(bookmarks.bookmarkedAt, new Date(filters.dateFrom)));
  }

  if (filters.dateTo) {
    conditions.push(lte(bookmarks.bookmarkedAt, new Date(filters.dateTo)));
  }

  if (filters.hasMedia !== undefined) {
    conditions.push(eq(bookmarks.hasMedia, filters.hasMedia));
  }

  if (filters.isProcessed !== undefined) {
    if (filters.isProcessed) {
      conditions.push(isNotNull(bookmarks.lastProcessedAt));
    } else {
      conditions.push(isNull(bookmarks.lastProcessedAt));
    }
  }

  if (filters.learningDepth) {
    conditions.push(eq(bookmarks.learningDepth, filters.learningDepth));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(bookmarks)
    .where(whereClause);
  const total = totalResult[0]?.count || 0;

  // Build orderBy
  const sortColumn = filters.sortBy === "bookmarkedAt" ? bookmarks.bookmarkedAt :
                     filters.sortBy === "tweetCreatedAt" ? bookmarks.tweetCreatedAt :
                     filters.sortBy === "tweetLikes" ? bookmarks.tweetLikes :
                     bookmarks.bookmarkedAt;

  const orderByClause = filters.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Get paginated results
  const results = await db
    .select({
      id: bookmarks.id,
      tweetId: bookmarks.tweetId,
      tweetText: bookmarks.tweetText,
      tweetAuthorId: bookmarks.tweetAuthorId,
      tweetAuthorName: bookmarks.tweetAuthorName,
      tweetAuthorHandle: bookmarks.tweetAuthorHandle,
      tweetAuthorProfileImage: bookmarks.tweetAuthorProfileImage,
      tweetCreatedAt: bookmarks.tweetCreatedAt,
      tweetLikes: bookmarks.tweetLikes,
      tweetRetweets: bookmarks.tweetRetweets,
      tweetUrl: bookmarks.tweetUrl,
      hasMedia: bookmarks.hasMedia,
      mediaUrls: bookmarks.mediaUrls,
      isThread: bookmarks.isThread,
      bookmarkedAt: bookmarks.bookmarkedAt,
      lastProcessedAt: bookmarks.lastProcessedAt,
      summary: bookmarks.summary,
      topics: bookmarks.topics,
      learningDepth: bookmarks.learningDepth,
      keyTakeaways: bookmarks.keyTakeaways,
    })
    .from(bookmarks)
    .where(whereClause)
    .orderBy(orderByClause)
    .offset((filters.page - 1) * filters.pageSize)
    .limit(filters.pageSize);

  return paginatedResponse(results, filters.page, filters.pageSize, total);
});
