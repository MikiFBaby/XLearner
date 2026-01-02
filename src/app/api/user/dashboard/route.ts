import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, successResponse, withErrorHandler } from "@/lib/api-utils";

// GET /api/user/dashboard - Get dashboard stats and recommendations
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get bookmark stats
  const [totalBookmarks, processedBookmarks] = await Promise.all([
    prisma.bookmark.count({ where: { userId: user.id } }),
    prisma.bookmark.count({
      where: { userId: user.id, lastProcessedAt: { not: null } },
    }),
  ]);

  // Get course stats
  const [activeCourses, completedCourses] = await Promise.all([
    prisma.course.count({
      where: { userId: user.id, status: "published" },
    }),
    prisma.learningProgress.count({
      where: {
        userId: user.id,
        status: "completed",
        lessonId: null, // Course-level progress
      },
    }),
  ]);

  // Get total learning time (from completed lessons)
  const completedProgress = await prisma.learningProgress.findMany({
    where: {
      userId: user.id,
      status: "completed",
      lessonId: { not: null },
    },
    include: {
      lesson: {
        select: { duration: true },
      },
    },
  });

  const totalLearningMinutes = Math.round(
    completedProgress.reduce((acc, p) => acc + (p.lesson?.duration || 0), 0) / 60
  );

  // Get top topics
  const bookmarksWithTopics = await prisma.bookmark.findMany({
    where: { userId: user.id },
    select: { topics: true },
  });

  const topicCounts: Record<string, number> = {};
  bookmarksWithTopics.forEach((b) => {
    b.topics.forEach((topic) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  // Get current course (most recently accessed)
  const currentProgress = await prisma.learningProgress.findFirst({
    where: {
      userId: user.id,
      status: "in_progress",
    },
    orderBy: { lastAccessedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          estimatedMinutes: true,
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          moduleId: true,
        },
      },
    },
  });

  // Get recommendations
  const recommendations = [];

  if (currentProgress) {
    recommendations.push({
      type: "continue",
      title: "Continue Learning",
      description: `Pick up where you left off: ${currentProgress.lesson?.title || currentProgress.course.title}`,
      courseId: currentProgress.courseId,
      lessonId: currentProgress.lessonId,
      estimatedMinutes: 15,
    });
  }

  // Suggest new courses from unprocessed bookmarks
  if (processedBookmarks > 5) {
    recommendations.push({
      type: "new_course",
      title: "Create a New Course",
      description: `You have ${processedBookmarks} analyzed bookmarks ready to become courses.`,
      estimatedMinutes: 5,
    });
  }

  return successResponse({
    stats: {
      totalBookmarks,
      processedBookmarks,
      activeCourses,
      completedCourses,
      totalLearningMinutes,
      currentStreak: 0, // TODO: Implement streak tracking
      topTopics,
    },
    currentCourse: currentProgress
      ? {
          ...currentProgress.course,
          currentLesson: currentProgress.lesson,
          progressPercent: currentProgress.progressPercent,
        }
      : null,
    recommendations,
    lastSyncAt: user.lastSyncAt,
  });
});
