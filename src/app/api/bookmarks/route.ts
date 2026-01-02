import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  paginatedResponse,
  requireAuth,
  validateQuery,
  withErrorHandler,
} from "@/lib/api-utils";
import { bookmarkFilterSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

// GET /api/bookmarks - List user's bookmarks with filtering and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const filters = validateQuery(searchParams, bookmarkFilterSchema);

  // Build where clause
  const where: Prisma.BookmarkWhereInput = {
    userId: user.id,
  };

  if (filters.topics) {
    const topicsArray = filters.topics.split(",").map((t) => t.trim());
    where.topics = { hasSome: topicsArray };
  }

  if (filters.author) {
    where.tweetAuthorHandle = { contains: filters.author, mode: "insensitive" };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.bookmarkedAt = {};
    if (filters.dateFrom) {
      where.bookmarkedAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.bookmarkedAt.lte = new Date(filters.dateTo);
    }
  }

  if (filters.hasMedia !== undefined) {
    where.hasMedia = filters.hasMedia;
  }

  if (filters.isProcessed !== undefined) {
    where.lastProcessedAt = filters.isProcessed ? { not: null } : null;
  }

  if (filters.learningDepth) {
    where.learningDepth = filters.learningDepth;
  }

  // Get total count
  const total = await prisma.bookmark.count({ where });

  // Build orderBy
  const orderBy: Prisma.BookmarkOrderByWithRelationInput = {
    [filters.sortBy]: filters.sortOrder,
  };

  // Get paginated results
  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy,
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
    select: {
      id: true,
      tweetId: true,
      tweetText: true,
      tweetAuthorId: true,
      tweetAuthorName: true,
      tweetAuthorHandle: true,
      tweetCreatedAt: true,
      tweetLikes: true,
      tweetRetweets: true,
      tweetUrl: true,
      hasMedia: true,
      mediaUrls: true,
      isThread: true,
      bookmarkedAt: true,
      lastProcessedAt: true,
      summary: true,
      topics: true,
      learningDepth: true,
      keyTakeaways: true,
    },
  });

  return paginatedResponse(bookmarks, filters.page, filters.pageSize, total);
});

// POST /api/bookmarks/sync - Trigger bookmark sync (handled separately)
