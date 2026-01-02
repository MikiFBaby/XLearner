"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Heart,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GamificationBar } from "@/components/gamification-bar";
import { SyncHub } from "@/components/sync-hub";
import { ResourceGrid } from "@/components/resource-grid";
import { UserProgress } from "@/lib/gamification";
import Link from "next/link";

interface DashboardClientProps {
  userName: string;
  userAvatar?: string;
  isTwitterConnected: boolean;
  twitterUsername?: string;
  lastSyncAt?: Date | null;
  stats: { bookmarks: number; courses: number; completed: number };
  userProgress: UserProgress;
  recentBookmarks: Array<{
    id: string;
    tweetText: string;
    tweetAuthorHandle: string;
    topics: string[] | null;
    bookmarkedAt: Date;
  }>;
  topTopics: Array<{ name: string; count: number }>;
}

export function DashboardClient({
  userName,
  userAvatar,
  isTwitterConnected,
  twitterUsername,
  lastSyncAt,
  stats,
  userProgress,
  recentBookmarks,
  topTopics,
}: DashboardClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const handleSyncTwitter = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/twitter/sync", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Welcome + Gamification */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Welcome Card - Compact */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-indigo-500/20 border border-purple-500/20 backdrop-blur-sm lg:w-72 shrink-0">
          <Avatar className="h-12 w-12 ring-2 ring-purple-500/30">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="bg-purple-500/20 text-purple-300 font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Hey, {userName}!</h1>
            <p className="text-sm text-purple-300/70">Ready to learn?</p>
          </div>
        </div>

        {/* Gamification Bar - Full Width */}
        <div className="flex-1">
          <GamificationBar progress={userProgress} />
        </div>
      </div>

      {/* Sync Hub - Compact Multi-Platform */}
      <SyncHub
        twitterConnected={isTwitterConnected}
        twitterUsername={twitterUsername}
        lastSyncAt={lastSyncAt}
        bookmarkCount={stats.bookmarks}
        onSyncTwitter={handleSyncTwitter}
      />

      {/* Main Content Area */}
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Resource Grid */}
          {stats.bookmarks > 0 || isTwitterConnected ? (
            <ResourceGrid columns={4} rows={4} />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block w-72 shrink-0 space-y-4">
          {/* Quick Stats */}
          <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Bookmark} label="Resources" value={stats.bookmarks} color="text-sky-400" />
              <StatCard icon={GraduationCap} label="Courses" value={stats.courses} color="text-emerald-400" />
              <StatCard icon={Target} label="Completed" value={stats.completed} color="text-amber-400" />
              <StatCard icon={Flame} label="Streak" value={userProgress.streak} color="text-orange-400" suffix="days" />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Recent
              </h3>
              <Link href="/bookmarks" className="text-xs text-purple-400 hover:text-purple-300">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentBookmarks.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">No recent activity</p>
              ) : (
                recentBookmarks.slice(0, 4).map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center shrink-0">
                      <Bookmark className="h-3 w-3 text-white/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{bookmark.tweetText.slice(0, 40)}...</p>
                      <p className="text-[10px] text-white/40">@{bookmark.tweetAuthorHandle}</p>
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">{formatTime(bookmark.bookmarkedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Topics */}
          {topTopics.length > 0 && (
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Top Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {topTopics.map((topic) => (
                  <span
                    key={topic.name}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-xs text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {topic.name}
                    <span className="text-purple-400 font-medium">{topic.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Daily Challenge */}
          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-orange-500/20 border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Daily Challenge</span>
            </div>
            <p className="text-xs text-white/70 mb-3">Complete 3 resources today</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 w-1/3 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">1 of 3 completed</span>
              <span className="text-amber-400 font-medium">+100 XP</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <QuickAction
              href="/courses/new"
              icon={GraduationCap}
              label="New Course"
              color="from-blue-500 to-indigo-500"
            />
            <QuickAction
              href="/bookmarks/favorites"
              icon={Heart}
              label="Favorites"
              color="from-pink-500 to-rose-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <Icon className={`h-4 w-4 ${color} mb-1`} />
      <span className="text-lg font-bold text-white">
        {value}
        {suffix && <span className="text-xs text-white/50 ml-0.5">{suffix}</span>}
      </span>
      <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// Quick Action Component
function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-0.5"
    >
      <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span className="text-xs text-white/70 font-medium">{label}</span>
    </Link>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-white/5 border border-white/10">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
        <Sparkles className="h-10 w-10 text-purple-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Start Your Learning Journey</h2>
      <p className="text-sm text-white/50 max-w-md mb-6">
        Connect your social accounts or paste URLs to import learning resources and build your personalized curriculum
      </p>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          Add Resources
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white text-sm font-medium transition-colors">
          Learn More
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
