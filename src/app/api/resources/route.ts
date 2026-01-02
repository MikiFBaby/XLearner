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

// Generate a short summary from video title and description
function generateVideoSummary(title: string, description?: string): string {
  // Clean up title - remove common suffixes
  let cleanTitle = title
    .replace(/\s*\|\s*.+$/, '') // Remove "| Channel Name" suffix
    .replace(/\s*-\s*Official.*$/i, '') // Remove "- Official Video" etc
    .replace(/\s*\(Official.*\)$/i, '') // Remove "(Official Video)" etc
    .replace(/\s*\[.*\]$/i, '') // Remove bracketed suffixes
    .trim();

  // If description exists, try to extract first meaningful sentence
  if (description) {
    const firstSentence = description
      .split(/[.!?\n]/)[0]
      ?.trim()
      ?.slice(0, 150);

    if (firstSentence && firstSentence.length > 30 && !firstSentence.includes('http')) {
      return firstSentence + (firstSentence.length >= 150 ? '...' : '');
    }
  }

  // Fallback to cleaned title
  return `Learn about ${cleanTitle}`;
}

// Extract skills/learning outcomes from tags and description
function extractSkills(tags?: string[], description?: string, title?: string): string[] {
  const skills: Set<string> = new Set();

  // Common learning-related keywords to look for
  const skillKeywords = [
    'learn', 'tutorial', 'how to', 'guide', 'tips', 'tricks', 'master',
    'beginner', 'advanced', 'introduction', 'basics', 'fundamentals',
    'programming', 'coding', 'design', 'marketing', 'business', 'finance',
    'productivity', 'communication', 'leadership', 'analytics', 'strategy'
  ];

  // Extract from tags
  if (tags) {
    tags.slice(0, 5).forEach(tag => {
      const cleanTag = tag.toLowerCase().trim();
      if (cleanTag.length > 2 && cleanTag.length < 30) {
        // Capitalize first letter
        skills.add(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
      }
    });
  }

  // Extract from title
  if (title) {
    const titleLower = title.toLowerCase();
    skillKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
  }

  // Return top 3-5 skills
  return Array.from(skills).slice(0, 5);
}

// Fetch YouTube video metadata using YouTube Data API v3
async function fetchYouTubeMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  authorName?: string;
  authorProfileImage?: string;
  thumbnailUrl?: string;
  tags?: string[];
  channelId?: string;
  summary?: string;
  skills?: string[];
}> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Fall back to oembed if no API key
  if (!apiKey) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      if (!response.ok) return {};
      const data = await response.json();
      return {
        title: data.title,
        authorName: data.author_name,
        thumbnailUrl: data.thumbnail_url,
      };
    } catch {
      return {};
    }
  }

  try {
    // Extract video ID
    const videoId = extractYouTubeId(url);
    if (!videoId) return {};

    // Fetch video details
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    const videoResponse = await fetch(videoUrl);

    if (!videoResponse.ok) {
      console.error("YouTube API error:", await videoResponse.text());
      return {};
    }

    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      return {};
    }

    const snippet = videoData.items[0].snippet;
    const channelId = snippet.channelId;

    // Fetch channel details to get profile image
    let authorProfileImage: string | undefined;
    if (channelId) {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
      const channelResponse = await fetch(channelUrl);

      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        if (channelData.items && channelData.items.length > 0) {
          authorProfileImage = channelData.items[0].snippet.thumbnails?.default?.url ||
                              channelData.items[0].snippet.thumbnails?.medium?.url;
        }
      }
    }

    const fullDescription = snippet.description || '';
    const videoTags = snippet.tags || [];

    return {
      title: snippet.title,
      description: fullDescription.slice(0, 500),
      authorName: snippet.channelTitle,
      authorProfileImage,
      thumbnailUrl: snippet.thumbnails?.maxres?.url ||
                   snippet.thumbnails?.high?.url ||
                   snippet.thumbnails?.medium?.url ||
                   snippet.thumbnails?.default?.url,
      tags: videoTags.slice(0, 10),
      channelId,
      summary: generateVideoSummary(snippet.title, fullDescription),
      skills: extractSkills(videoTags, fullDescription, snippet.title),
    };
  } catch (error) {
    console.error("Error fetching YouTube metadata:", error);
    return {};
  }
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
    title?: string;
    description?: string;
    authorName?: string;
    authorHandle?: string; // Store channel profile image URL here
    thumbnailUrl?: string;
    topics?: string[];
    summary?: string;
    skills?: string[];
  } = {};

  if (platform === "youtube") {
    const videoId = extractYouTubeId(body.url);
    if (videoId) {
      // Fetch YouTube video metadata (title, author, thumbnail, channel avatar)
      const ytMetadata = await fetchYouTubeMetadata(body.url);
      metadata.channelId = ytMetadata.channelId || videoId;
      metadata.title = ytMetadata.title;
      metadata.description = ytMetadata.description;
      metadata.authorName = ytMetadata.authorName;
      metadata.authorHandle = ytMetadata.authorProfileImage; // Store profile image in authorHandle
      metadata.thumbnailUrl = ytMetadata.thumbnailUrl;
      metadata.topics = ytMetadata.tags;
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
      title: body.title || metadata.title,
      description: body.description || metadata.description,
      authorName: metadata.authorName,
      authorHandle: metadata.authorHandle, // Channel profile image URL for YouTube
      thumbnailUrl: metadata.thumbnailUrl,
      channelId: metadata.channelId,
      subreddit: metadata.subreddit,
      videoDuration: metadata.videoDuration,
      topics: metadata.topics,
      summary: metadata.summary,
      keyTakeaways: metadata.skills,
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

// PATCH /api/resources - Refresh metadata for YouTube videos
export const PATCH = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get all YouTube resources without titles for this user
  const youtubeResources = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.userId, user.id),
        eq(resources.platform, "youtube")
      )
    );

  let updated = 0;
  for (const resource of youtubeResources) {
    // Update if missing title, author, profile image, summary, or skills
    if (!resource.title || resource.title === resource.url || !resource.authorName || !resource.authorHandle || !resource.summary || !resource.keyTakeaways?.length) {
      const metadata = await fetchYouTubeMetadata(resource.url);

      if (metadata.title || metadata.authorName || metadata.authorProfileImage) {
        await db
          .update(resources)
          .set({
            title: metadata.title || resource.title,
            description: metadata.description || resource.description,
            authorName: metadata.authorName || resource.authorName,
            authorHandle: metadata.authorProfileImage || resource.authorHandle, // Channel profile image
            thumbnailUrl: metadata.thumbnailUrl || resource.thumbnailUrl,
            channelId: metadata.channelId || resource.channelId,
            topics: metadata.tags || resource.topics,
            summary: metadata.summary || resource.summary,
            keyTakeaways: metadata.skills || resource.keyTakeaways,
          })
          .where(eq(resources.id, resource.id));
        updated++;
      }
    }
  }

  return successResponse({
    message: `Updated ${updated} YouTube videos with metadata`,
    updated,
    total: youtubeResources.length,
  });
});
