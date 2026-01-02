import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                orderIndex: true,
                title: true,
                duration: true,
                audioUrl: true,
              },
            },
            quizzes: {
              select: {
                id: true,
                title: true,
                passingScore: true,
              },
            },
            bookmarks: {
              include: {
                bookmark: {
                  select: {
                    id: true,
                    tweetText: true,
                    tweetAuthorHandle: true,
                    tweetUrl: true,
                    summary: true,
                  },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        progress: {
          where: { userId: user.id },
          select: {
            lessonId: true,
            status: true,
            progressPercent: true,
            lastPosition: true,
            lastAccessedAt: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    // Calculate overall progress
    const totalLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0
    );
    const completedLessons = course.progress.filter(
      (p) => p.status === "completed"
    ).length;
    const overallProgress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return successResponse({
      ...course,
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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    const data = await validateBody(request, updateCourseSchema);

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...data,
        publishedAt: data.status === "published" ? new Date() : course.publishedAt,
      },
    });

    return successResponse(updated);
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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    if (course.userId !== user.id) {
      throw new ForbiddenError();
    }

    // Delete cascade will handle modules, lessons, etc.
    await prisma.course.delete({
      where: { id: courseId },
    });

    return successResponse({ message: "Course deleted" });
  }
);
