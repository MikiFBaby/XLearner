import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      id: { in: data.bookmarkIds },
      userId: user.id,
    },
    select: {
      id: true,
      tweetText: true,
      summary: true,
      topics: true,
      keyTakeaways: true,
    },
  });

  if (bookmarks.length !== data.bookmarkIds.length) {
    throw new ForbiddenError("One or more bookmarks not found or not owned by user");
  }

  // Aggregate topics from bookmarks
  const allTopics = new Set<string>();
  bookmarks.forEach((b) => b.topics.forEach((t) => allTopics.add(t)));

  // Create a placeholder course
  const course = await prisma.course.create({
    data: {
      userId: user.id,
      title: "Generating...",
      description: "AI is generating your course content.",
      estimatedMinutes: Math.max(30, bookmarks.length * 5),
      difficultyLevel: data.difficultyLevel || "intermediate",
      topics: Array.from(allTopics).slice(0, 5),
      status: "draft",
    },
  });

  // Create background job
  const job = await prisma.backgroundJob.create({
    data: {
      jobType: "generate_course",
      userId: user.id,
      status: "pending",
      payload: {
        courseId: course.id,
        bookmarkIds: data.bookmarkIds,
        userInstructions: data.userInstructions,
        difficultyLevel: data.difficultyLevel,
      },
    },
  });

  return successResponse({
    message: "Course generation started",
    courseId: course.id,
    jobId: job.id,
  }, 202);
});
