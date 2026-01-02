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

// Use Gemini AI to generate summary and extract skills
async function generateAISummaryAndSkills(
  title: string,
  description?: string,
  tags?: string[]
): Promise<{ summary: string; skills: string[] }> {
  const geminiApiKey = process.env.IMAGE_GEN_API_KEY;

  // Fallback to basic extraction if no API key
  if (!geminiApiKey) {
    return {
      summary: generateBasicSummary(title, description),
      skills: extractBasicSkills(tags, title),
    };
  }

  try {
    const prompt = `Analyze this YouTube video and provide:
1. A concise 1-2 sentence summary of what viewers will learn (max 150 chars)
2. 3-5 specific skills or insights gained from watching this video

Title: ${title}
Description: ${description?.slice(0, 500) || 'No description'}
Tags: ${tags?.slice(0, 10).join(', ') || 'None'}

Respond in JSON format only:
{"summary": "...", "skills": ["skill1", "skill2", "skill3"]}`;

    console.log('[Gemini] Calling API for:', title?.slice(0, 40));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', errorText);
      return {
        summary: generateBasicSummary(title, description),
        skills: extractBasicSkills(tags, title),
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Gemini] Response text:', text?.slice(0, 100));

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = {
        summary: parsed.summary?.slice(0, 200) || generateBasicSummary(title, description),
        skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 5) : extractBasicSkills(tags, title),
      };
      console.log('[Gemini] Parsed result:', result);
      return result;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
  }

  // Fallback
  return {
    summary: generateBasicSummary(title, description),
    skills: extractBasicSkills(tags, title),
  };
}

// Basic summary generation (fallback)
function generateBasicSummary(title: string, description?: string): string {
  let cleanTitle = title
    .replace(/\s*\|\s*.+$/, '')
    .replace(/\s*-\s*Official.*$/i, '')
    .replace(/\s*\(Official.*\)$/i, '')
    .replace(/\s*\[.*\]$/i, '')
    .trim();

  if (description) {
    const firstSentence = description
      .split(/[.!?\n]/)[0]
      ?.trim()
      ?.slice(0, 150);

    if (firstSentence && firstSentence.length > 30 && !firstSentence.includes('http')) {
      return firstSentence + (firstSentence.length >= 150 ? '...' : '');
    }
  }

  return `Learn about ${cleanTitle}`;
}

// Basic skills extraction (fallback)
function extractBasicSkills(tags?: string[], title?: string): string[] {
  const skills: Set<string> = new Set();

  const skillKeywords = [
    'learn', 'tutorial', 'how to', 'guide', 'tips', 'tricks', 'master',
    'beginner', 'advanced', 'introduction', 'basics', 'fundamentals',
    'programming', 'coding', 'design', 'marketing', 'business', 'finance',
    'productivity', 'communication', 'leadership', 'analytics', 'strategy'
  ];

  if (tags) {
    tags.slice(0, 5).forEach(tag => {
      const cleanTag = tag.toLowerCase().trim();
      if (cleanTag.length > 2 && cleanTag.length < 30) {
        skills.add(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
      }
    });
  }

  if (title) {
    const titleLower = title.toLowerCase();
    skillKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
  }

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

    // Use Gemini AI to generate summary and extract skills
    const aiResult = await generateAISummaryAndSkills(
      snippet.title,
      fullDescription,
      videoTags
    );

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
      summary: aiResult.summary,
      skills: aiResult.skills,
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
      metadata.summary = ytMetadata.summary;
      metadata.skills = ytMetadata.skills;
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

  // Debug: log first result
  if (results.length > 0) {
    const r = results[0];
    console.log(`[GET] First resource: authorHandle=${r.authorHandle?.slice(0, 50)}, summary=${r.summary?.slice(0, 50)}, keyTakeaways=${r.keyTakeaways?.length || 0}`);
  }

  return paginatedResponse(results, page, pageSize, total);
});

// PATCH /api/resources - Refresh metadata for YouTube videos
// NOTE: External APIs (YouTube, Gemini) are blocked in this environment
// So we generate summaries/skills directly from existing title data
export const PATCH = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get all YouTube resources for this user
  const youtubeResources = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.userId, user.id),
        eq(resources.platform, "youtube")
      )
    );

  console.log(`[PATCH] Found ${youtubeResources.length} YouTube resources`);

  let updated = 0;
  for (const resource of youtubeResources) {
    // Update if missing summary or skills (we generate these locally)
    const needsUpdate = !resource.summary || !resource.keyTakeaways?.length;

    console.log(`[PATCH] Resource ${resource.id}: needsUpdate=${needsUpdate}, title="${resource.title?.slice(0, 40)}"`);

    if (needsUpdate && resource.title) {
      // Generate summary and skills directly from title (no external API calls)
      const summary = generateSmartSummary(resource.title, resource.description || undefined);
      const skills = generateSmartSkills(resource.title, resource.description || undefined);

      console.log(`[PATCH] Generated - summary: "${summary.slice(0, 50)}", skills: [${skills.join(', ')}]`);

      await db
        .update(resources)
        .set({
          summary: summary,
          keyTakeaways: skills,
        })
        .where(eq(resources.id, resource.id));
      updated++;
    }
  }

  // Get one updated resource to verify data
  const sampleResource = youtubeResources.length > 0 ? await db
    .select()
    .from(resources)
    .where(eq(resources.id, youtubeResources[0].id))
    .limit(1) : [];

  console.log(`[PATCH] Complete. Updated ${updated}/${youtubeResources.length} resources`);

  return successResponse({
    message: `Updated ${updated} YouTube videos with summaries`,
    updated,
    total: youtubeResources.length,
    sample: sampleResource.length > 0 ? {
      title: sampleResource[0].title,
      summary: sampleResource[0].summary,
      keyTakeaways: sampleResource[0].keyTakeaways,
    } : null,
  });
});

// Generate a smart summary from video title
function generateSmartSummary(title: string, description?: string): string {
  // Clean up the title
  let cleanTitle = title
    .replace(/\s*\|\s*.+$/, '')           // Remove "| Channel Name"
    .replace(/\s*-\s*[^-]+$/, '')         // Remove "- Author Name" at end
    .replace(/\s*\(4K\)|\(HD\)|\(Official\)/gi, '')  // Remove quality/official markers
    .replace(/\s*\[[^\]]+\]$/i, '')       // Remove [brackets] at end
    .replace(/\s*#\w+/g, '')              // Remove hashtags
    .trim();

  // If we have a good description, use its first sentence
  if (description) {
    const firstSentence = description
      .split(/[.!?\n]/)[0]
      ?.trim()
      ?.slice(0, 200);

    if (firstSentence && firstSentence.length > 40 && !firstSentence.includes('http')) {
      return firstSentence + (firstSentence.length >= 200 ? '...' : '');
    }
  }

  // Generate contextual summary based on title patterns
  const titleLower = cleanTitle.toLowerCase();

  if (titleLower.includes('how to') || titleLower.includes('tutorial')) {
    return `Step-by-step guide: ${cleanTitle}`;
  }
  if (titleLower.includes('truth') || titleLower.includes('secrets') || titleLower.includes('lessons')) {
    return `Key insights and wisdom from: ${cleanTitle}`;
  }
  if (titleLower.includes('review') || titleLower.includes('unboxing')) {
    return `In-depth analysis: ${cleanTitle}`;
  }
  if (titleLower.includes('interview') || titleLower.includes('podcast') || titleLower.includes('conversation')) {
    return `Discussion and insights: ${cleanTitle}`;
  }
  if (titleLower.includes('explained') || titleLower.includes('guide')) {
    return `Comprehensive explanation: ${cleanTitle}`;
  }
  if (/^\d+/.test(cleanTitle)) {
    // Starts with number like "10 Ways to..."
    return `Collection of insights: ${cleanTitle}`;
  }

  return `Explore and learn: ${cleanTitle}`;
}

// Generate smart skills/takeaways from video title
function generateSmartSkills(title: string, description?: string): string[] {
  const skills: string[] = [];
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combined = titleLower + ' ' + descLower;

  // Topic-based skills extraction
  const topicPatterns: [RegExp, string[]][] = [
    [/life|living|mindset|success|habits/i, ['Life Philosophy', 'Personal Growth', 'Mindset Development']],
    [/business|entrepreneur|startup|company/i, ['Business Strategy', 'Entrepreneurship', 'Leadership']],
    [/money|invest|finance|wealth|rich/i, ['Financial Literacy', 'Investment Strategy', 'Wealth Building']],
    [/programming|coding|developer|software/i, ['Programming', 'Software Development', 'Technical Skills']],
    [/health|fitness|workout|exercise/i, ['Health & Fitness', 'Physical Wellness', 'Exercise']],
    [/psychology|brain|mind|think/i, ['Psychology', 'Mental Models', 'Critical Thinking']],
    [/communication|speaking|social/i, ['Communication Skills', 'Public Speaking', 'Social Dynamics']],
    [/productivity|focus|time|efficiency/i, ['Productivity', 'Time Management', 'Focus']],
    [/design|creative|art|visual/i, ['Design Thinking', 'Creativity', 'Visual Skills']],
    [/marketing|sales|growth|audience/i, ['Marketing', 'Sales Strategy', 'Audience Growth']],
    [/ai|machine learning|artificial/i, ['AI & Machine Learning', 'Technology Trends', 'Innovation']],
    [/crypto|bitcoin|blockchain/i, ['Cryptocurrency', 'Blockchain', 'Digital Assets']],
    [/android|ios|mobile|app/i, ['Mobile Development', 'App Design', 'User Experience']],
    [/samsung|iphone|phone|device/i, ['Consumer Technology', 'Device Reviews', 'Tech Analysis']],
  ];

  for (const [pattern, topicSkills] of topicPatterns) {
    if (pattern.test(combined)) {
      skills.push(...topicSkills.slice(0, 2));
    }
  }

  // Title structure patterns
  if (/how to|tutorial|guide|learn/i.test(titleLower)) {
    skills.push('Practical Application');
  }
  if (/\d+\s*(tips|ways|things|lessons|rules|truths|habits)/i.test(titleLower)) {
    skills.push('Actionable Insights');
  }
  if (/interview|podcast|conversation/i.test(titleLower)) {
    skills.push('Expert Perspectives');
  }

  // Remove duplicates and limit
  const uniqueSkills = [...new Set(skills)];

  // If we found specific skills, return them
  if (uniqueSkills.length > 0) {
    return uniqueSkills.slice(0, 5);
  }

  // Default skills based on it being educational content
  return ['Knowledge Building', 'Learning', 'Personal Development'];
}
