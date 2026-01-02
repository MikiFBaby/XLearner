import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, bookmarks, courses, learningProgress } from "@/lib/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Heart,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { TwitterConnectClient } from "./twitter-connect-client";
import { BookmarksKanban } from "@/components/bookmarks-kanban";

// Welcome Banner Component
function WelcomeBanner({
  userName,
  userAvatar,
  stats
}: {
  userName: string;
  userAvatar?: string | null;
  stats: { bookmarks: number; courses: number; completed: number };
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 p-6 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-4 ring-white/30">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome {userName},</h1>
            <p className="text-purple-100">We&apos;re here to help. Let&apos;s continue learning!</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center rounded-xl bg-white/20 backdrop-blur-sm px-5 py-3 min-w-[100px]">
            <Bookmark className="h-5 w-5 mb-1 text-purple-100" />
            <span className="text-2xl font-bold">{stats.bookmarks}</span>
            <span className="text-xs text-purple-100">Bookmarks</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white/20 backdrop-blur-sm px-5 py-3 min-w-[100px]">
            <GraduationCap className="h-5 w-5 mb-1 text-purple-100" />
            <span className="text-2xl font-bold">{stats.courses}</span>
            <span className="text-xs text-purple-100">Courses</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white/20 backdrop-blur-sm px-5 py-3 min-w-[100px]">
            <CheckCircle2 className="h-5 w-5 mb-1 text-purple-100" />
            <span className="text-2xl font-bold">{stats.completed}</span>
            <span className="text-xs text-purple-100">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Featured Content Carousel
function FeaturedCarousel() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a0a2e] to-[#0a0118] aspect-[2/1] border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-indigo-900/20" />

      <div className="relative h-full flex flex-col justify-end p-6">
        <span className="inline-flex items-center rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300 ring-1 ring-inset ring-purple-500/30 w-fit mb-3">
          Featured
        </span>
        <h3 className="text-xl font-bold text-white mb-1">Transform Your Bookmarks Into Knowledge</h3>
        <p className="text-gray-400 text-sm">Connect your X account to get started with AI-powered learning</p>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button className="h-2 w-2 rounded-full bg-purple-400" />
        <button className="h-2 w-2 rounded-full bg-white/30" />
        <button className="h-2 w-2 rounded-full bg-white/30" />
      </div>

      {/* Navigation arrows */}
      <button className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// Suggested Item Card
function SuggestedItemCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
  href
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  href: string;
}) {
  return (
    <div className="group rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-1 cursor-pointer">
      <div className="flex flex-col items-center text-center">
        <div className={`mb-4 rounded-xl p-4 ${gradient}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{subtitle}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/10 bg-white/5 text-white hover:bg-purple-500 hover:border-purple-500 hover:text-white transition-colors"
          asChild
        >
          <Link href={href}>View Details</Link>
        </Button>
      </div>
    </div>
  );
}

// Right Sidebar - My Items
function MyItemsSidebar({
  recentBookmarks
}: {
  recentBookmarks: Array<{
    id: string;
    tweetText: string;
    tweetAuthorHandle: string;
    topics: string[] | null;
    bookmarkedAt: Date;
  }>;
}) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60);
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">My Items</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-400 hover:bg-white/10">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {recentBookmarks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No bookmarks yet</p>
        ) : (
          recentBookmarks.slice(0, 6).map((bookmark) => (
            <div key={bookmark.id} className="flex items-start gap-3 group">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bookmark className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {bookmark.tweetText.slice(0, 50)}...
                </p>
                <p className="text-xs text-gray-500">{formatTime(bookmark.bookmarkedAt)}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  bookmark.topics && bookmark.topics.length > 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}
              >
                {bookmark.topics && bookmark.topics.length > 0 ? 'Analyzed' : 'Open'}
              </span>
            </div>
          ))
        )}
      </div>
      {recentBookmarks.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <Link href="/bookmarks" className="text-purple-400 hover:text-purple-300">View All</Link>
          <span>First {Math.min(6, recentBookmarks.length)} of {recentBookmarks.length}</span>
        </div>
      )}
    </div>
  );
}

// My To-Dos Sidebar
function MyTodosSidebar() {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">My To-Dos</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-400 hover:bg-white/10">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <p className="font-medium text-white">No To-Dos</p>
        <p className="text-sm text-gray-500">You currently have no To-Dos</p>
      </div>
    </div>
  );
}

// Top Topics Sidebar
function TopTopicsSidebar({ topics }: { topics: Array<{ name: string; count: number }> }) {
  if (topics.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
      <h3 className="text-base font-semibold text-white mb-4">Top Topics</h3>
      <div className="space-y-2">
        {topics.slice(0, 5).map((topic) => (
          <div key={topic.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{topic.name}</span>
            <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400">
              {topic.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Access Card
function QuickAccessCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
  href
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group">
      <div className="flex flex-col items-center text-center">
        <div className={`mb-3 h-12 w-12 rounded-xl ${gradient} flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
        <Link href={href} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
          View details
        </Link>
      </div>
    </div>
  );
}

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

  // Get recent bookmarks
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
    .limit(10);

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
    .sort((a, b) => b.count - a.count);

  const stats = {
    bookmarks: bookmarkCount[0]?.count || 0,
    courses: courseCount[0]?.count || 0,
    completed: completedCount[0]?.count || 0,
  };

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Welcome Banner */}
        <WelcomeBanner
          userName={userName}
          userAvatar={user.twitterAvatar || user.image}
          stats={stats}
        />

        {/* Connect Twitter Card - only show if not connected */}
        {!isTwitterConnected && (
          <TwitterConnectClient
            isConnected={false}
            twitterUsername={undefined}
            lastSyncAt={undefined}
            enableRealtimeSync={false}
          />
        )}

        {/* Twitter Connected - Show sync button */}
        {isTwitterConnected && (
          <TwitterConnectClient
            isConnected={true}
            twitterUsername={user.twitterUsername || undefined}
            lastSyncAt={user.lastSyncAt}
            enableRealtimeSync={user.enableRealtimeSync}
          />
        )}

        {/* AI Learning Kanban Board */}
        {isTwitterConnected && stats.bookmarks > 0 && (
          <BookmarksKanban />
        )}

        {/* Featured Carousel */}
        <FeaturedCarousel />

        {/* Suggested Items Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Suggested for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SuggestedItemCard
              title="Create Course"
              subtitle="From bookmarks"
              icon={GraduationCap}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              href="/courses/new"
            />
            <SuggestedItemCard
              title="Sync Bookmarks"
              subtitle="Import from X"
              icon={RefreshCw}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              href="/bookmarks"
            />
            <SuggestedItemCard
              title="Browse Topics"
              subtitle="Explore content"
              icon={Sparkles}
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
              href="/topics"
            />
            <SuggestedItemCard
              title="View Insights"
              subtitle="Learning stats"
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              href="/insights"
            />
          </div>
        </div>

        {/* Quick Access Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAccessCard
              title="All Bookmarks"
              subtitle={`${stats.bookmarks} items`}
              icon={Bookmark}
              gradient="bg-gradient-to-br from-red-500 to-pink-500"
              href="/bookmarks"
            />
            <QuickAccessCard
              title="My Courses"
              subtitle={`${stats.courses} courses`}
              icon={GraduationCap}
              gradient="bg-gradient-to-br from-green-500 to-emerald-500"
              href="/courses"
            />
            <QuickAccessCard
              title="Explore"
              subtitle="Discover content"
              icon={BookOpen}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
              href="/explore"
            />
            <QuickAccessCard
              title="Favorites"
              subtitle="Saved items"
              icon={Heart}
              gradient="bg-gradient-to-br from-amber-500 to-orange-500"
              href="/bookmarks/favorites"
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden xl:block w-80 shrink-0 space-y-6">
        <MyItemsSidebar recentBookmarks={recentBookmarks} />
        <MyTodosSidebar />
        <TopTopicsSidebar topics={topTopics} />
      </div>
    </div>
  );
}
