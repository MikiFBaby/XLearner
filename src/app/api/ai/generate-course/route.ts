import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, courses, backgroundJobs } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  ForbiddenError,
  requireAuth,
  successResponse,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";
import { generateCourseSchema } from "@/lib/validations";

// POST /api/ai/generate-course - Generate course from bookmarks
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const data = await validateBody(request, generateCourseSchema);

  // Verify all bookmarks belong to user
  const bookmarkResults = await db
    .select({
      id: bookmarks.id,
      tweetText: bookmarks.tweetText,
      summary: bookmarks.summary,
      topics: bookmarks.topics,
      keyTakeaways: bookmarks.keyTakeaways,
    })
    .from(bookmarks)
    .where(
      and(
        inArray(bookmarks.id, data.bookmarkIds),
        eq(bookmarks.userId, user.id)
      )
    );

  if (bookmarkResults.length !== data.bookmarkIds.length) {
    throw new ForbiddenError("One or more bookmarks not found or not owned by user");
  }

  // Aggregate topics from bookmarks
  const allTopics = new Set<string>();
  bookmarkResults.forEach((b) => {
    if (b.topics) {
      b.topics.forEach((t) => allTopics.add(t));
    }
  });

  // Create a placeholder course
  const courseResult = await db
    .insert(courses)
    .values({
      userId: user.id,
      title: "Generating...",
      description: "AI is generating your course content.",
      estimatedMinutes: Math.max(30, bookmarkResults.length * 5),
      difficultyLevel: data.difficultyLevel || "intermediate",
      topics: Array.from(allTopics).slice(0, 5),
      status: "draft",
    })
    .returning();

  const course = courseResult[0];

  // Create background job
  const jobResult = await db
    .insert(backgroundJobs)
    .values({
      jobType: "generate_course",
      userId: user.id,
      status: "pending",
      payload: {
        courseId: course.id,
        bookmarkIds: data.bookmarkIds,
        userInstructions: data.userInstructions,
        difficultyLevel: data.difficultyLevel,
      },
    })
    .returning();

  return successResponse({
    message: "Course generation started",
    courseId: course.id,
    jobId: jobResult[0].id,
  }, 202);
});
