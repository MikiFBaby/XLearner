import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, courses, learningProgress, lessons } from "@/lib/schema";
import { eq, and, isNotNull, isNull, desc, count, sql } from "drizzle-orm";
import { requireAuth, successResponse, withErrorHandler } from "@/lib/api-utils";

// GET /api/user/dashboard - Get dashboard stats and recommendations
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  // Get bookmark stats
  const [totalBookmarksResult, processedBookmarksResult] = await Promise.all([
    db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.userId, user.id)),
    db.select({ count: count() }).from(bookmarks).where(
      and(eq(bookmarks.userId, user.id), isNotNull(bookmarks.lastProcessedAt))
    ),
  ]);

  const totalBookmarks = totalBookmarksResult[0]?.count || 0;
  const processedBookmarks = processedBookmarksResult[0]?.count || 0;

  // Get course stats
  const [activeCoursesResult, completedCoursesResult] = await Promise.all([
    db.select({ count: count() }).from(courses).where(
      and(eq(courses.userId, user.id), eq(courses.status, "published"))
    ),
    db.select({ count: count() }).from(learningProgress).where(
      and(
        eq(learningProgress.userId, user.id),
        eq(learningProgress.status, "completed"),
        isNull(learningProgress.lessonId)
      )
    ),
  ]);

  const activeCourses = activeCoursesResult[0]?.count || 0;
  const completedCourses = completedCoursesResult[0]?.count || 0;

  // Get total learning time (from completed lessons)
  const completedProgress = await db
    .select({
      lessonId: learningProgress.lessonId,
      duration: lessons.duration,
    })
    .from(learningProgress)
    .leftJoin(lessons, eq(learningProgress.lessonId, lessons.id))
    .where(
      and(
        eq(learningProgress.userId, user.id),
        eq(learningProgress.status, "completed"),
        isNotNull(learningProgress.lessonId)
      )
    );

  const totalLearningMinutes = Math.round(
    completedProgress.reduce((acc, p) => acc + (p.duration || 0), 0) / 60
  );

  // Get top topics
  const bookmarksWithTopics = await db
    .select({ topics: bookmarks.topics })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id));

  const topicCounts: Record<string, number> = {};
  bookmarksWithTopics.forEach((b) => {
    if (b.topics) {
      b.topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });

  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  // Get current course (most recently accessed)
  const currentProgressResult = await db
    .select({
      progressId: learningProgress.id,
      courseId: learningProgress.courseId,
      lessonId: learningProgress.lessonId,
      progressPercent: learningProgress.progressPercent,
      courseTitle: courses.title,
      estimatedMinutes: courses.estimatedMinutes,
      lessonTitle: lessons.title,
      lessonModuleId: lessons.moduleId,
    })
    .from(learningProgress)
    .innerJoin(courses, eq(learningProgress.courseId, courses.id))
    .leftJoin(lessons, eq(learningProgress.lessonId, lessons.id))
    .where(
      and(
        eq(learningProgress.userId, user.id),
        eq(learningProgress.status, "in_progress")
      )
    )
    .orderBy(desc(learningProgress.lastAccessedAt))
    .limit(1);

  const currentProgress = currentProgressResult[0];

  // Get recommendations
  const recommendations = [];

  if (currentProgress) {
    recommendations.push({
      type: "continue",
      title: "Continue Learning",
      description: `Pick up where you left off: ${currentProgress.lessonTitle || currentProgress.courseTitle}`,
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
          id: currentProgress.courseId,
          title: currentProgress.courseTitle,
          estimatedMinutes: currentProgress.estimatedMinutes,
          currentLesson: currentProgress.lessonId
            ? {
                id: currentProgress.lessonId,
                title: currentProgress.lessonTitle,
                moduleId: currentProgress.lessonModuleId,
              }
            : null,
          progressPercent: currentProgress.progressPercent,
        }
      : null,
    recommendations,
    lastSyncAt: user.lastSyncAt,
  });
});
