import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { courses, modules, backgroundJobs } from "@/lib/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";
import {
  paginatedResponse,
  requireAuth,
  successResponse,
  validateBody,
  validateQuery,
  withErrorHandler,
} from "@/lib/api-utils";
import { courseFilterSchema, createCourseSchema } from "@/lib/validations";

// GET /api/courses - List user's courses
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const filters = validateQuery(searchParams, courseFilterSchema);

  // Build where conditions
  const conditions = [eq(courses.userId, user.id)];

  if (filters.status) {
    conditions.push(eq(courses.status, filters.status));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(courses)
    .where(whereClause);
  const total = totalResult[0]?.count || 0;

  // Build orderBy
  const sortColumn = filters.sortBy === "createdAt" ? courses.createdAt :
                     filters.sortBy === "updatedAt" ? courses.updatedAt :
                     filters.sortBy === "title" ? courses.title :
                     courses.createdAt;

  const orderByClause = filters.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Get paginated results
  const courseResults = await db
    .select()
    .from(courses)
    .where(whereClause)
    .orderBy(orderByClause)
    .offset((filters.page - 1) * filters.pageSize)
    .limit(filters.pageSize);

  // Get modules for each course
  const coursesWithModules = await Promise.all(
    courseResults.map(async (course) => {
      const courseModules = await db
        .select({
          id: modules.id,
          title: modules.title,
          orderIndex: modules.orderIndex,
        })
        .from(modules)
        .where(eq(modules.courseId, course.id))
        .orderBy(asc(modules.orderIndex))
        .limit(5);

      const moduleCount = await db
        .select({ count: count() })
        .from(modules)
        .where(eq(modules.courseId, course.id));

      return {
        ...course,
        _count: {
          modules: moduleCount[0]?.count || 0,
        },
        modules: courseModules,
      };
    })
  );

  return paginatedResponse(coursesWithModules, filters.page, filters.pageSize, total);
});

// POST /api/courses - Create a new course
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const data = await validateBody(request, createCourseSchema);

  // Calculate estimated time based on content
  const estimatedMinutes = data.bookmarkIds
    ? Math.max(15, data.bookmarkIds.length * 5)
    : 30;

  const courseResult = await db
    .insert(courses)
    .values({
      userId: user.id,
      title: data.title,
      description: data.description,
      difficultyLevel: data.difficultyLevel,
      topics: data.topics,
      estimatedMinutes,
      status: "draft",
    })
    .returning();

  const course = courseResult[0];

  // If auto-generate is requested, queue a background job
  if (data.autoGenerate && data.bookmarkIds && data.bookmarkIds.length > 0) {
    await db.insert(backgroundJobs).values({
      jobType: "generate_course",
      userId: user.id,
      status: "pending",
      payload: {
        courseId: course.id,
        bookmarkIds: data.bookmarkIds,
        userInstructions: data.userInstructions,
      },
    });
  }

  return successResponse({ ...course, modules: [] }, 201);
});
