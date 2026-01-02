import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  paginatedResponse,
  requireAuth,
  successResponse,
  validateBody,
  validateQuery,
  withErrorHandler,
} from "@/lib/api-utils";
import { courseFilterSchema, createCourseSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

// GET /api/courses - List user's courses
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const filters = validateQuery(searchParams, courseFilterSchema);

  const where: Prisma.CourseWhereInput = {
    userId: user.id,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  const total = await prisma.course.count({ where });

  const orderBy: Prisma.CourseOrderByWithRelationInput = {
    [filters.sortBy]: filters.sortOrder,
  };

  const courses = await prisma.course.findMany({
    where,
    orderBy,
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
    include: {
      _count: {
        select: {
          modules: true,
          progress: true,
        },
      },
      modules: {
        select: {
          id: true,
          title: true,
          orderIndex: true,
          _count: {
            select: {
              lessons: true,
            },
          },
        },
        orderBy: { orderIndex: "asc" },
        take: 5,
      },
    },
  });

  return paginatedResponse(courses, filters.page, filters.pageSize, total);
});

// POST /api/courses - Create a new course
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const data = await validateBody(request, createCourseSchema);

  // Calculate estimated time based on content
  const estimatedMinutes = data.bookmarkIds
    ? Math.max(15, data.bookmarkIds.length * 5)
    : 30;

  const course = await prisma.course.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description,
      difficultyLevel: data.difficultyLevel,
      topics: data.topics,
      estimatedMinutes,
      status: "draft",
    },
    include: {
      modules: true,
    },
  });

  // If auto-generate is requested, queue a background job
  if (data.autoGenerate && data.bookmarkIds && data.bookmarkIds.length > 0) {
    await prisma.backgroundJob.create({
      data: {
        jobType: "generate_course",
        userId: user.id,
        status: "pending",
        payload: {
          courseId: course.id,
          bookmarkIds: data.bookmarkIds,
          userInstructions: data.userInstructions,
        },
      },
    });
  }

  return successResponse(course, 201);
});
