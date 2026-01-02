"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Clock,
  GraduationCap,
  MoreVertical,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface CourseData {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  estimatedMinutes: number;
  difficultyLevel: string;
  topics: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    modules: number;
    progress: number;
  };
  modules: {
    id: string;
    title: string;
    orderIndex: number;
    _count: {
      lessons: number;
    };
  }[];
}

interface CoursesResponse {
  success: boolean;
  data: CourseData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

async function fetchCourses(page = 1): Promise<CoursesResponse> {
  const res = await fetch(`/api/courses?page=${page}&pageSize=12`);
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json();
}

function getDifficultyColor(level: string) {
  switch (level) {
    case "beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

function CourseCard({ course }: { course: CourseData }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {course.description}
            </CardDescription>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded p-1 hover:bg-accent">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                align="end"
              >
                <DropdownMenu.Item className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                  Edit Course
                </DropdownMenu.Item>
                <DropdownMenu.Item className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                  Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item className="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge className={getDifficultyColor(course.difficultyLevel)}>
            {course.difficultyLevel}
          </Badge>
          <Badge variant="outline">
            {course.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {course._count.modules} modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.estimatedMinutes}m
          </span>
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-1 mt-3">
          {course.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
          {course.topics.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{course.topics.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button asChild className="w-full">
          <Link href={`/courses/${course.id}`}>
            <Play className="mr-2 h-4 w-4" />
            {course._count.progress > 0 ? "Continue" : "Start Learning"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CourseSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-32" />
      </CardContent>
      <CardFooter className="pt-2">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function CoursesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["courses", page],
    queryFn: () => fetchCourses(page),
  });

  const courses = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            My Courses
          </h1>
          <p className="text-muted-foreground">
            {pagination?.total || 0} courses created
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-4">
        <Card className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center gap-4 py-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Generate with AI</CardTitle>
              <CardDescription>
                Create a course from your bookmarks
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Courses grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>
              Create your first course from your bookmarks using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevious}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
