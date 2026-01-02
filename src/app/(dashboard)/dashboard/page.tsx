import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, bookmarks, courses, learningProgress, lessons, modules } from "@/lib/schema";
import { eq, and, desc, isNotNull, count } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  Play,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

async function DashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.twitterId, session.user.twitterId))
    .limit(1);

  const user = userResult[0];
  if (!user) return null;

  const [totalBookmarksResult, processedBookmarksResult, activeCoursesResult, completedLessonsResult] =
    await Promise.all([
      db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.userId, user.id)),
      db.select({ count: count() }).from(bookmarks).where(
        and(eq(bookmarks.userId, user.id), isNotNull(bookmarks.lastProcessedAt))
      ),
      db.select({ count: count() }).from(courses).where(
        and(eq(courses.userId, user.id), eq(courses.status, "published"))
      ),
      db.select({ count: count() }).from(learningProgress).where(
        and(
          eq(learningProgress.userId, user.id),
          eq(learningProgress.status, "completed"),
          isNotNull(learningProgress.lessonId)
        )
      ),
    ]);

  const stats = [
    {
      name: "Total Bookmarks",
      value: totalBookmarksResult[0]?.count || 0,
      icon: Bookmark,
      color: "text-blue-500",
    },
    {
      name: "Analyzed",
      value: processedBookmarksResult[0]?.count || 0,
      icon: Sparkles,
      color: "text-purple-500",
    },
    {
      name: "Active Courses",
      value: activeCoursesResult[0]?.count || 0,
      icon: GraduationCap,
      color: "text-green-500",
    },
    {
      name: "Lessons Completed",
      value: completedLessonsResult[0]?.count || 0,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function CurrentLearning() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.twitterId, session.user.twitterId))
    .limit(1);

  const user = userResult[0];
  if (!user) return null;

  const currentProgressResult = await db
    .select({
      id: learningProgress.id,
      courseId: learningProgress.courseId,
      lessonId: learningProgress.lessonId,
      progressPercent: learningProgress.progressPercent,
      courseTitle: courses.title,
      lessonTitle: lessons.title,
      moduleTitle: modules.title,
    })
    .from(learningProgress)
    .innerJoin(courses, eq(learningProgress.courseId, courses.id))
    .leftJoin(lessons, eq(learningProgress.lessonId, lessons.id))
    .leftJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(
        eq(learningProgress.userId, user.id),
        eq(learningProgress.status, "in_progress")
      )
    )
    .orderBy(desc(learningProgress.lastAccessedAt))
    .limit(1);

  const currentProgress = currentProgressResult[0];

  if (!currentProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Start Learning
          </CardTitle>
          <CardDescription>
            You haven&apos;t started any courses yet. Create your first course from
            your bookmarks!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/courses">
              <Sparkles className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Continue Learning
            </CardTitle>
            <CardDescription className="mt-1">
              {currentProgress.courseTitle}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {currentProgress.progressPercent}% complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Lesson</p>
          <p className="font-medium">
            {currentProgress.lessonTitle || "Getting Started"}
          </p>
        </div>
        <Progress value={currentProgress.progressPercent} />
        <Button asChild className="w-full">
          <Link href={`/courses/${currentProgress.courseId}`}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function RecentBookmarks() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.twitterId, session.user.twitterId))
    .limit(1);

  const user = userResult[0];
  if (!user) return null;

  const recentBookmarks = await db
    .select({
      id: bookmarks.id,
      tweetText: bookmarks.tweetText,
      tweetAuthorHandle: bookmarks.tweetAuthorHandle,
      topics: bookmarks.topics,
      summary: bookmarks.summary,
      bookmarkedAt: bookmarks.bookmarkedAt,
    })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.bookmarkedAt))
    .limit(5);

  if (recentBookmarks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Your Bookmarks
          </CardTitle>
          <CardDescription>
            No bookmarks synced yet. Click the sync button to import your X
            bookmarks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Bookmarks
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Recent Bookmarks
          </CardTitle>
          <CardDescription>Your latest saved content</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/bookmarks">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0"
            >
              <p className="text-sm line-clamp-2">
                {bookmark.summary || bookmark.tweetText}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  @{bookmark.tweetAuthorHandle}
                </span>
                <div className="flex gap-1">
                  {(bookmark.topics || []).slice(0, 2).map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function TopTopics() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.twitterId, session.user.twitterId))
    .limit(1);

  const user = userResult[0];
  if (!user) return null;

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
    .slice(0, 6);

  if (topTopics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Topics
        </CardTitle>
        <CardDescription>
          Most common topics in your bookmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topTopics.map(([topic, count]) => (
            <Badge key={topic} variant="outline" className="gap-1">
              {topic}
              <span className="text-muted-foreground">({count})</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your learning journey.
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          }
        >
          <CurrentLearning />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          }
        >
          <TopTopics />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        }
      >
        <RecentBookmarks />
      </Suspense>
    </div>
  );
}
