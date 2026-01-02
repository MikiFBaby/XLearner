import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resources } from "@/lib/schema";
import { eq, and, desc, count } from "drizzle-orm";
import {
  successResponse,
  paginatedResponse,
  requireAuth,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";

// Validation schema for adding a resource
const addResourceSchema = z.object({
  url: z.string().url("Invalid URL"),
  platform: z.enum(["youtube", "reddit", "manual", "twitter"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// Helper to detect platform from URL
function detectPlatform(url: string): "youtube" | "reddit" | "twitter" | "manual" {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/reddit\.com|redd\.it/i.test(url)) return "reddit";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return "manual";
}

// Helper to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/i,
    /youtube\.com\/shorts\/([^&?/]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper to extract Reddit info from URL
function extractRedditInfo(url: string): { subreddit?: string } {
  const match = url.match(/reddit\.com\/r\/([^/]+)/i);
  return { subreddit: match ? match[1] : undefined };
}

// POST /api/resources - Add a new resource
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await validateBody(request, addResourceSchema);

  const platform = body.platform || detectPlatform(body.url);

  // Extract platform-specific metadata
  let metadata: {
    channelId?: string;
    subreddit?: string;
    videoDuration?: number;
  } = {};

  if (platform === "youtube") {
    const videoId = extractYouTubeId(body.url);
    if (videoId) {
      // Could fetch YouTube metadata here with YouTube Data API
      metadata.channelId = videoId; // Store video ID for now
    }
  } else if (platform === "reddit") {
    const redditInfo = extractRedditInfo(body.url);
    metadata.subreddit = redditInfo.subreddit;
  }

  // Check if resource already exists for this user
  const existing = await db
    .select()
    .from(resources)
    .where(and(eq(resources.userId, user.id), eq(resources.url, body.url)))
    .limit(1);

  if (existing.length > 0) {
    return successResponse({
      resource: existing[0],
      isNew: false,
      message: "Resource already exists"
    });
  }

  // Insert the new resource
  const [newResource] = await db
    .insert(resources)
    .values({
      userId: user.id,
      url: body.url,
      platform,
      title: body.title,
      description: body.description,
      ...metadata,
    })
    .returning();

  return successResponse({
    resource: newResource,
    isNew: true,
    message: "Resource added successfully"
  }, 201);
});

// GET /api/resources - List user's resources
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);

  const platform = searchParams.get("platform");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  // Build conditions
  const conditions = [eq(resources.userId, user.id)];

  if (platform && ["youtube", "reddit", "manual", "twitter"].includes(platform)) {
    conditions.push(eq(resources.platform, platform));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(resources)
    .where(whereClause);
  const total = totalResult[0]?.count || 0;

  // Get paginated results
  const results = await db
    .select()
    .from(resources)
    .where(whereClause)
    .orderBy(desc(resources.addedAt))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return paginatedResponse(results, page, pageSize, total);
});
