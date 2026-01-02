import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  errorResponse,
  requireAuth,
  successResponse,
  withErrorHandler,
} from "@/lib/api-utils";
import {
  generateImage,
  createImagePrompt,
  getPlaceholderImage,
  ImageGenerationConfig,
} from "@/lib/media-utils";

// POST /api/bookmarks/[id]/generate-image - Generate an AI image for a bookmark
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    const user = await requireAuth();
    const bookmarkId = params.id;

    // Get the bookmark
    const bookmarkResult = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, user.id)))
      .limit(1);

    const bookmark = bookmarkResult[0];
    if (!bookmark) {
      return errorResponse("Bookmark not found", 404);
    }

    // Check if bookmark already has media
    if (bookmark.hasMedia && bookmark.mediaUrls && bookmark.mediaUrls.length > 0) {
      return successResponse({
        message: "Bookmark already has media",
        imageUrl: bookmark.mediaUrls[0],
        generated: false,
      });
    }

    // Get image generation config from environment
    const provider = process.env.IMAGE_GEN_PROVIDER as ImageGenerationConfig['provider'] || 'openai';
    const apiKey = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return a placeholder if no API key configured
      const placeholderUrl = getPlaceholderImage(bookmark.id);
      return successResponse({
        message: "No image generation API configured, using placeholder",
        imageUrl: placeholderUrl,
        generated: false,
        placeholder: true,
      });
    }

    // Create prompt from bookmark content
    const prompt = createImagePrompt(
      bookmark.tweetText,
      bookmark.topics || [],
      "Twitter"
    );

    // Generate image
    const config: ImageGenerationConfig = {
      provider,
      apiKey,
      model: process.env.IMAGE_GEN_MODEL,
    };

    const result = await generateImage(prompt, config);

    if (result.error || !result.url) {
      // Fall back to placeholder on error
      const placeholderUrl = getPlaceholderImage(bookmark.id);
      return successResponse({
        message: `Generation failed: ${result.error}. Using placeholder.`,
        imageUrl: placeholderUrl,
        generated: false,
        placeholder: true,
        error: result.error,
      });
    }

    // Update bookmark with generated image
    await db
      .update(bookmarks)
      .set({
        hasMedia: true,
        mediaUrls: [result.url],
      })
      .where(eq(bookmarks.id, bookmarkId));

    return successResponse({
      message: "Image generated successfully",
      imageUrl: result.url,
      generated: true,
    });
  }
);
