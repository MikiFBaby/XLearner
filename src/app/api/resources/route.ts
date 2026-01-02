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
import { YoutubeTranscript } from "youtube-transcript";

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

// Fetch YouTube video transcript
async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[Transcript] Fetching transcript for video: ${videoId}`);
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      console.log(`[Transcript] No transcript available for ${videoId}`);
      return null;
    }

    // Combine all transcript segments into one text
    const fullTranscript = transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[Transcript] Got ${transcriptItems.length} segments, ${fullTranscript.length} chars`);

    // Limit transcript to ~4000 chars for Gemini (to stay within token limits)
    return fullTranscript.slice(0, 4000);
  } catch (error) {
    console.error(`[Transcript] Error fetching transcript for ${videoId}:`, error);
    return null;
  }
}

// Analyze transcript with Gemini AI to generate summary, key takeaways, and knowledge tags
async function analyzeWithGemini(
  title: string,
  transcript: string | null,
  description?: string
): Promise<{ summary: string; keyTakeaways: string[]; knowledgeTags: string[] }> {
  const geminiApiKey = process.env.IMAGE_GEN_API_KEY;

  // Fallback if no API key or no transcript
  if (!geminiApiKey) {
    console.log('[Gemini] No API key, using fallback');
    return generateFallbackAnalysis(title, description);
  }

  try {
    const contentToAnalyze = transcript
      ? `Transcript: ${transcript}`
      : `Description: ${description?.slice(0, 1000) || 'No description available'}`;

    const prompt = `Analyze this YouTube video and provide a structured analysis.

Title: ${title}
${contentToAnalyze}

Respond in JSON format ONLY with these exact fields:
{
  "summary": "A concise 2-3 sentence summary of the main points and value of this video (max 250 chars)",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3", "takeaway4", "takeaway5"],
  "knowledgeTags": ["tag1", "tag2", "tag3"]
}

Guidelines:
- summary: What will viewers learn? What's the core message?
- keyTakeaways: 3-5 specific, actionable insights or lessons from the content
- knowledgeTags: 3 broad knowledge categories this content falls under (e.g., "Personal Development", "Business Strategy", "Technology")`;

    console.log('[Gemini] Calling API for analysis...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText.slice(0, 200));
      return generateFallbackAnalysis(title, description);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Gemini] Raw response:', text.slice(0, 200));

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = {
        summary: parsed.summary?.slice(0, 300) || `Learn key insights from: ${title}`,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 5) : [],
        knowledgeTags: Array.isArray(parsed.knowledgeTags) ? parsed.knowledgeTags.slice(0, 5) : [],
      };
      console.log('[Gemini] Parsed result:', JSON.stringify(result).slice(0, 200));
      return result;
    }

    console.log('[Gemini] Could not parse JSON from response');
    return generateFallbackAnalysis(title, description);
  } catch (error) {
    console.error('[Gemini] Error:', error);
    return generateFallbackAnalysis(title, description);
  }
}

// Fallback analysis when Gemini is unavailable
function generateFallbackAnalysis(title: string, description?: string): {
  summary: string;
  keyTakeaways: string[];
  knowledgeTags: string[];
} {
  // Clean up the title
  const cleanTitle = title
    .replace(/\s*\|\s*.+$/, '')
    .replace(/\s*-\s*[^-]+$/, '')
    .replace(/\s*\(4K\)|\(HD\)|\(Official\)/gi, '')
    .replace(/\s*\[[^\]]+\]$/i, '')
    .trim();

  const titleLower = cleanTitle.toLowerCase();

  // Generate contextual summary
  let summary: string;
  if (titleLower.includes('how to') || titleLower.includes('tutorial')) {
    summary = `Step-by-step guide covering: ${cleanTitle}`;
  } else if (titleLower.includes('truth') || titleLower.includes('secrets') || titleLower.includes('lessons')) {
    summary = `Key insights and wisdom: ${cleanTitle}`;
  } else if (titleLower.includes('review')) {
    summary = `In-depth analysis and review: ${cleanTitle}`;
  } else if (/^\d+/.test(cleanTitle)) {
    summary = `Collection of valuable insights: ${cleanTitle}`;
  } else {
    summary = `Explore and learn: ${cleanTitle}`;
  }

  // Generate knowledge tags based on content
  const tags: string[] = [];
  if (/life|living|mindset|success|habits/i.test(titleLower)) tags.push('Personal Development');
  if (/business|entrepreneur|startup/i.test(titleLower)) tags.push('Business');
  if (/money|invest|finance|wealth/i.test(titleLower)) tags.push('Finance');
  if (/programming|coding|software|tech/i.test(titleLower)) tags.push('Technology');
  if (/health|fitness|workout/i.test(titleLower)) tags.push('Health & Fitness');
  if (/psychology|brain|mind/i.test(titleLower)) tags.push('Psychology');
  if (tags.length === 0) tags.push('Education', 'Learning');

  // Generate key takeaways
  const takeaways: string[] = [];
  if (/truth|lesson|insight/i.test(titleLower)) takeaways.push('Life lessons and wisdom');
  if (/how to|guide|tutorial/i.test(titleLower)) takeaways.push('Practical step-by-step guidance');
  if (/success|achieve|goal/i.test(titleLower)) takeaways.push('Strategies for achievement');
  if (/mindset|think|psychology/i.test(titleLower)) takeaways.push('Mental frameworks and perspectives');
  if (takeaways.length === 0) takeaways.push('Key concepts and ideas', 'Actionable insights');

  return {
    summary: summary.slice(0, 300),
    keyTakeaways: takeaways.slice(0, 5),
    knowledgeTags: tags.slice(0, 5),
  };
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
// Fetches transcript → Sends to Gemini → Gets summary, key takeaways, knowledge tags
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
  const errors: string[] = [];

  for (const resource of youtubeResources) {
    // Update if missing summary or key takeaways
    const needsUpdate = !resource.summary || !resource.keyTakeaways?.length;

    if (!needsUpdate) {
      console.log(`[PATCH] Skipping ${resource.id} - already has data`);
      continue;
    }

    if (!resource.title) {
      console.log(`[PATCH] Skipping ${resource.id} - no title`);
      continue;
    }

    try {
      // Extract video ID
      const videoId = extractYouTubeId(resource.url);
      if (!videoId) {
        console.log(`[PATCH] Skipping ${resource.id} - invalid URL`);
        continue;
      }

      console.log(`[PATCH] Processing: "${resource.title?.slice(0, 40)}..." (${videoId})`);

      // Step 1: Fetch transcript
      const transcript = await fetchYouTubeTranscript(videoId);
      console.log(`[PATCH] Transcript: ${transcript ? `${transcript.length} chars` : 'not available'}`);

      // Step 2: Analyze with Gemini (uses transcript if available, falls back to title/description)
      const analysis = await analyzeWithGemini(
        resource.title,
        transcript,
        resource.description || undefined
      );

      console.log(`[PATCH] Analysis result:`, {
        summary: analysis.summary?.slice(0, 50),
        takeaways: analysis.keyTakeaways?.length,
        tags: analysis.knowledgeTags?.length,
      });

      // Step 3: Update database
      await db
        .update(resources)
        .set({
          summary: analysis.summary,
          keyTakeaways: analysis.keyTakeaways,
          topics: analysis.knowledgeTags, // Store knowledge tags in topics field
        })
        .where(eq(resources.id, resource.id));

      updated++;
      console.log(`[PATCH] ✓ Updated resource ${resource.id}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PATCH] Error processing ${resource.id}:`, errorMsg);
      errors.push(`${resource.title?.slice(0, 30)}: ${errorMsg}`);
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
    message: `Analyzed ${updated} YouTube videos with transcripts`,
    updated,
    total: youtubeResources.length,
    errors: errors.length > 0 ? errors : undefined,
    sample: sampleResource.length > 0 ? {
      title: sampleResource[0].title,
      summary: sampleResource[0].summary,
      keyTakeaways: sampleResource[0].keyTakeaways,
      topics: sampleResource[0].topics,
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
