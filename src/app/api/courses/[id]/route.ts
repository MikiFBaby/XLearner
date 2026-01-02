import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { courses, modules, lessons, quizzes, moduleBookmarks, bookmarks, learningProgress } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  errorResponse,
  ForbiddenError,
  NotFoundError,
  requireAuth,
  successResponse,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";
import { updateCourseSchema } from "@/lib/validations";

interface RouteContext {
  params: { id: string };
}

// GET /api/courses/:id - Get course details with modules
export const GET = withErrorHandler(
  async (_request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const courseId = context?.params.id;

    if (!courseId) {
      return errorResponse("Course ID is required", 400);
    }

    const courseResult = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    const course = courseResult[0];

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    // Get modules with lessons, quizzes, and bookmarks
    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.orderIndex));

    const modulesWithContent = await Promise.all(
      courseModules.map(async (module) => {
        // Get lessons
        const moduleLessons = await db
          .select({
            id: lessons.id,
            orderIndex: lessons.orderIndex,
            title: lessons.title,
            duration: lessons.duration,
            audioUrl: lessons.audioUrl,
          })
          .from(lessons)
          .where(eq(lessons.moduleId, module.id))
          .orderBy(asc(lessons.orderIndex));

        // Get quizzes
        const moduleQuizzes = await db
          .select({
            id: quizzes.id,
            title: quizzes.title,
            passingScore: quizzes.passingScore,
          })
          .from(quizzes)
          .where(eq(quizzes.moduleId, module.id));

        // Get bookmarks
        const moduleBookmarkJoins = await db
          .select({
            orderIndex: moduleBookmarks.orderIndex,
            bookmark: {
              id: bookmarks.id,
              tweetText: bookmarks.tweetText,
              tweetAuthorHandle: bookmarks.tweetAuthorHandle,
              tweetUrl: bookmarks.tweetUrl,
              summary: bookmarks.summary,
            },
          })
          .from(moduleBookmarks)
          .innerJoin(bookmarks, eq(moduleBookmarks.bookmarkId, bookmarks.id))
          .where(eq(moduleBookmarks.moduleId, module.id))
          .orderBy(asc(moduleBookmarks.orderIndex));

        return {
          ...module,
          lessons: moduleLessons,
          quizzes: moduleQuizzes,
          bookmarks: moduleBookmarkJoins,
        };
      })
    );

    // Get progress
    const progress = await db
      .select({
        lessonId: learningProgress.lessonId,
        status: learningProgress.status,
        progressPercent: learningProgress.progressPercent,
        lastPosition: learningProgress.lastPosition,
        lastAccessedAt: learningProgress.lastAccessedAt,
      })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, user.id),
          eq(learningProgress.courseId, courseId)
        )
      );

    // Calculate overall progress
    const totalLessons = modulesWithContent.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    );
    const completedLessons = progress.filter(
      (p) => p.status === "completed"
    ).length;
    const overallProgress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return successResponse({
      ...course,
      modules: modulesWithContent,
      progress,
      overallProgress,
      totalLessons,
      completedLessons,
    });
  }
);

// PATCH /api/courses/:id - Update course
export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const courseId = context?.params.id;

    if (!courseId) {
      return errorResponse("Course ID is required", 400);
    }

    const courseResult = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    const course = courseResult[0];

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    const data = await validateBody(request, updateCourseSchema);

    const updatedResult = await db
      .update(courses)
      .set({
        ...data,
        publishedAt: data.status === "published" ? new Date() : course.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    return successResponse(updatedResult[0]);
  }
);

// DELETE /api/courses/:id - Delete course
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context?: RouteContext) => {
    const user = await requireAuth();
    const courseId = context?.params.id;

    if (!courseId) {
      return errorResponse("Course ID is required", 400);
    }

    const courseResult = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    const course = courseResult[0];

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    // Delete cascade will handle modules, lessons, etc.
    await db.delete(courses).where(eq(courses.id, courseId));

    return successResponse({ message: "Course deleted" });
  }
);
