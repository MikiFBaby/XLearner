import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, bookmarks, courses, learningProgress } from "@/lib/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import { DEFAULT_PROGRESS } from "@/lib/gamification";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user data
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userResult[0];
  if (!user) {
    redirect("/login");
  }

  const userName = user.name || session.user.email?.split("@")[0] || "there";
  const isTwitterConnected = !!user.twitterConnectedAt;

  // Get stats
  const [bookmarkCount, courseCount, completedCount] = await Promise.all([
    db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.userId, user.id)),
    db.select({ count: count() }).from(courses).where(eq(courses.userId, user.id)),
    db.select({ count: count() }).from(learningProgress).where(
      and(eq(learningProgress.userId, user.id), eq(learningProgress.status, "completed"))
    ),
  ]);

  // Get recent bookmarks for sidebar
  const recentBookmarks = await db
    .select({
      id: bookmarks.id,
      tweetText: bookmarks.tweetText,
      tweetAuthorHandle: bookmarks.tweetAuthorHandle,
      topics: bookmarks.topics,
      bookmarkedAt: bookmarks.bookmarkedAt,
    })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.bookmarkedAt))
    .limit(6);

  // Calculate top topics
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
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stats = {
    bookmarks: bookmarkCount[0]?.count || 0,
    courses: courseCount[0]?.count || 0,
    completed: completedCount[0]?.count || 0,
  };

  // Mock user progress (would come from DB in production)
  const userProgress = {
    ...DEFAULT_PROGRESS,
    xp: stats.completed * 50 + stats.bookmarks * 10,
    resourcesCompleted: stats.completed,
    streak: 3, // Mock streak
    todayTimeMinutes: 45, // Mock today's time
    achievements: stats.bookmarks > 0 ? ["first_steps"] : [],
  };

  return (
    <DashboardClient
      userName={userName}
      userAvatar={user.twitterAvatar || user.image || undefined}
      isTwitterConnected={isTwitterConnected}
      twitterUsername={user.twitterUsername || undefined}
      lastSyncAt={user.lastSyncAt}
      stats={stats}
      userProgress={userProgress}
      recentBookmarks={recentBookmarks}
      topTopics={topTopics}
    />
  );
}
